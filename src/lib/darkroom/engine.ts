/* -----------------------------------------------------------
 * DARKROOM — the engine
 *
 * One WebGL2 context for the whole page. Browsers cap live contexts
 * at roughly 16, and /art has 24 plates, so each plate gets a plain
 * 2D canvas and the GL canvas (never attached to the DOM) is the
 * enlarger: render a plate, copy it out with drawImage, move on.
 *
 * A "negative" is the GPU-side state for one image: the image at the
 * size it's printed, plus its baked halation layer. Negatives are
 * meant to be short-lived — the caller releases them as soon as a
 * plate stops animating, and the 2D canvas keeps the finished pixels.
 * That bounds GPU memory to the plates currently in motion.
 * ----------------------------------------------------------- */

import { BLUR, HIGHLIGHT, PRINT, VERTEX } from './shaders';

export interface Negative {
	image: WebGLTexture;
	halo: WebGLTexture;
}

export interface PrintParams {
	/** 0 = unexposed paper, 1 = finished print. */
	develop: number;
	saturation: number;
	contrast: number;
	/** Strength of the red-orange glow around highlights. */
	halation: number;
	/** Grain amplitude at mid-grey. */
	grain: number;
	/** Offsets the grain pattern so neighbouring plates don't match. */
	seed: number;
	/** Paper white, 0–1 sRGB. */
	paper: readonly [number, number, number];
	/** Maps the output rect onto the image (object-fit: cover crops). */
	cropScale: readonly [number, number];
	cropOffset: readonly [number, number];
}

/** Halation is baked at this fraction of the print size. */
const HALO_SCALE = 0.25;
/** Only light above this (max channel, 0–1) contributes to halation. */
const HALO_THRESHOLD = 0.62;
/** Blur tap spacing in halo texels; with two passes, sigma ≈ 5 texels. */
const HALO_SPREAD = 1.6;

type Program = { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation> };

export class DarkroomEngine {
	private readonly gl: WebGL2RenderingContext;
	private readonly canvas: HTMLCanvasElement;
	private readonly scratch: HTMLCanvasElement;
	private readonly highlight: Program;
	private readonly blur: Program;
	private readonly print: Program;
	private readonly vao: WebGLVertexArrayObject;
	private lost = false;

	/** Returns null when WebGL2 is missing or any shader fails to build. */
	static create(onLost: () => void): DarkroomEngine | null {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: false,
			powerPreference: 'low-power',
		});
		if (!gl) return null;
		try {
			return new DarkroomEngine(canvas, gl, onLost);
		} catch (error) {
			console.warn('[darkroom] falling back to plain images:', error);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
			return null;
		}
	}

	private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, onLost: () => void) {
		this.canvas = canvas;
		this.gl = gl;
		this.scratch = document.createElement('canvas');
		this.highlight = this.link(HIGHLIGHT);
		this.blur = this.link(BLUR);
		this.print = this.link(PRINT);
		this.vao = gl.createVertexArray()!;

		canvas.addEventListener('webglcontextlost', (event) => {
			event.preventDefault();
			this.lost = true;
			onLost();
		});
	}

	get isLost(): boolean {
		return this.lost || this.gl.isContextLost();
	}

	/**
	 * Upload an image at the pixel size it will be printed, and bake its
	 * halation. The downscale happens on a 2D canvas first, so the GPU
	 * never holds a 1440px texture for a 300px plate.
	 */
	develop(img: HTMLImageElement, width: number, height: number): Negative | null {
		if (this.isLost) return null;
		const { gl } = this;
		const w = Math.max(1, Math.round(width));
		const h = Math.max(1, Math.round(height));

		this.scratch.width = w;
		this.scratch.height = h;
		const ctx = this.scratch.getContext('2d');
		if (!ctx) return null;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, 0, 0, w, h);

		const image = this.texture(w, h);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.scratch);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		// Free the scratch bitmap; it can be several megabytes.
		this.scratch.width = this.scratch.height = 1;

		const hw = Math.max(1, Math.round(w * HALO_SCALE));
		const hh = Math.max(1, Math.round(h * HALO_SCALE));
		const a = this.texture(hw, hh, true);
		const b = this.texture(hw, hh, true);
		const fbo = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.viewport(0, 0, hw, hh);
		gl.bindVertexArray(this.vao);

		this.pass(this.highlight, a, image, { uThreshold: HALO_THRESHOLD, uTexel: [1 / w, 1 / h] });
		for (let i = 0; i < 2; i++) {
			this.pass(this.blur, b, a, { uStep: [HALO_SPREAD / hw, 0] });
			this.pass(this.blur, a, b, { uStep: [0, HALO_SPREAD / hh] });
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fbo);
		gl.deleteTexture(b);
		return { image, halo: a };
	}

	/** Render one frame of a print into a plate's 2D canvas. */
	render(negative: Negative, target: CanvasRenderingContext2D, params: PrintParams): void {
		if (this.isLost) return;
		const { gl, canvas } = this;
		const w = target.canvas.width;
		const h = target.canvas.height;

		// The GL canvas only ever grows; each plate draws into its
		// bottom-left corner. Resizing per plate would reallocate the
		// drawing buffer on every frame.
		if (canvas.width < w || canvas.height < h) {
			canvas.width = Math.max(canvas.width, w);
			canvas.height = Math.max(canvas.height, h);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, w, h);
		gl.useProgram(this.print.program);
		gl.bindVertexArray(this.vao);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, negative.image);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, negative.halo);

		const u = this.print.uniforms;
		gl.uniform1i(u.get('uImage')!, 0);
		gl.uniform1i(u.get('uHalo')!, 1);
		gl.uniform2f(u.get('uCropScale')!, params.cropScale[0], params.cropScale[1]);
		gl.uniform2f(u.get('uCropOffset')!, params.cropOffset[0], params.cropOffset[1]);
		gl.uniform2f(u.get('uResolution')!, w, h);
		gl.uniform3f(u.get('uPaper')!, params.paper[0], params.paper[1], params.paper[2]);
		gl.uniform1f(u.get('uDevelop')!, params.develop);
		gl.uniform1f(u.get('uSaturation')!, params.saturation);
		gl.uniform1f(u.get('uContrast')!, params.contrast);
		gl.uniform1f(u.get('uHalation')!, params.halation);
		gl.uniform1f(u.get('uGrain')!, params.grain);
		gl.uniform1f(u.get('uSeed')!, params.seed);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// Copy out in the same task as the draw: the drawing buffer isn't
		// preserved, but it's still intact until the browser composites.
		target.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, w, h);
	}

	release(negative: Negative): void {
		if (this.isLost) return;
		this.gl.deleteTexture(negative.image);
		this.gl.deleteTexture(negative.halo);
	}

	private pass(
		program: Program,
		target: WebGLTexture,
		source: WebGLTexture,
		uniforms: Record<string, number | [number, number]>,
	): void {
		const { gl } = this;
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
		gl.useProgram(program.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, source);
		const first = program.uniforms.get('uImage') ?? program.uniforms.get('uSource');
		if (first) gl.uniform1i(first, 0);
		for (const [name, value] of Object.entries(uniforms)) {
			const location = program.uniforms.get(name);
			if (!location) continue;
			if (typeof value === 'number') gl.uniform1f(location, value);
			else gl.uniform2f(location, value[0], value[1]);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	/** An RGBA8 texture with linear filtering and clamped edges. */
	private texture(w: number, h: number, allocate = false): WebGLTexture {
		const { gl } = this;
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if (allocate) gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
		return tex;
	}

	private link(fragmentSource: string): Program {
		const { gl } = this;
		const program = gl.createProgram()!;
		const shaders = [
			this.compile(gl.VERTEX_SHADER, VERTEX),
			this.compile(gl.FRAGMENT_SHADER, fragmentSource),
		];
		shaders.forEach((shader) => gl.attachShader(program, shader));
		gl.linkProgram(program);
		shaders.forEach((shader) => gl.deleteShader(shader));
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
		}

		const uniforms = new Map<string, WebGLUniformLocation>();
		const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
		for (let i = 0; i < count; i++) {
			const info = gl.getActiveUniform(program, i);
			const location = info && gl.getUniformLocation(program, info.name);
			if (info && location) uniforms.set(info.name, location);
		}
		return { program, uniforms };
	}

	private compile(type: number, source: string): WebGLShader {
		const { gl } = this;
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
		}
		return shader;
	}
}
