/* ==========================================================================
 * POSTER STAGE — Tactile Darkroom Print & Xerox Zine WebGL2 Engine
 *
 * Renders the hero contact-sheet print using real artwork already in the DOM
 * as <Image> elements (instant LCP and crisp static fallback). When WebGL2 is
 * available, prints the active plate as either:
 *   - COLOR (default): warm darkroom fiber print with CineStill-style highlight
 *     halation, fine midtone silver-halide grain, and subtle enlarger vignette.
 *   - XEROX: warm charcoal & uncoated newsprint photocopy/zine halftone print.
 *
 * No pointer tracking, no hover aperture lens, no continuous animation loop —
 * frames render only while switching plates or toggling print modes.
 * ========================================================================== */

const VERT = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uMix;
uniform vec2 uCropScaleA;
uniform vec2 uCropOffsetA;
uniform vec2 uCropScaleB;
uniform vec2 uCropOffsetB;
uniform vec2 uRes;
uniform float uXeroxMix; // 0 = darkroom color print, 1 = warm xerox halftone print
uniform vec3 uShadowInk;
uniform vec3 uSpotInk;
uniform vec3 uPaper;

out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

vec3 samplePlate(sampler2D tex, vec2 uv, vec2 scale, vec2 offset) {
	vec2 cUv = clamp(uv * scale + offset, vec2(0.001), vec2(0.999));
	return texture(tex, cUv).rgb;
}

vec3 sampleBlended(vec2 uv) {
	vec3 a = samplePlate(uTexA, uv, uCropScaleA, uCropOffsetA);
	if (uMix <= 0.001) return a;
	vec3 b = samplePlate(uTexB, uv, uCropScaleB, uCropOffsetB);
	return mix(a, b, uMix);
}

// Angled photocopy / zine halftone dot screen
float halftone(vec2 px, float angle, float pitch) {
	float s = sin(angle);
	float c = cos(angle);
	vec2 r = mat2(c, -s, s, c) * px;
	vec2 cell = fract(r / pitch) - 0.5;
	return 1.0 - smoothstep(0.18, 0.52, length(cell));
}

void main() {
	vec2 px = vUv * uRes;
	float minDim = min(uRes.x, uRes.y);
	vec3 raw = sampleBlended(vUv);

	// Subtle static analog grain (triangular distribution, weighted toward midtones)
	vec2 cell = floor(px);
	float triNoise = hash(cell) + hash(cell + vec2(17.3, 9.1)) - 1.0;

	// --- 1. COLOR DARKROOM PRINT ---
	// Rich warm fiber print: gentle contrast, lifted warm darkroom black floor,
	// subtle CineStill red-orange highlight halation, and faint enlarger vignette.
	vec3 film = clamp((raw - 0.5) * 1.08 + 0.5, 0.0, 1.0);
	film = mix(vec3(0.068, 0.062, 0.056), film, 0.96);

	float peak = max(film.r, max(film.g, film.b));
	float bloom = smoothstep(0.64, 1.0, peak) * 0.24;
	film = 1.0 - (1.0 - film) * (1.0 - vec3(1.0, 0.26, 0.14) * bloom);

	// Subtle warm paper cast in upper highlights
	float filmLuma = dot(film, LUMA);
	film = mix(film, film * vec3(1.015, 0.995, 0.965), smoothstep(0.35, 0.95, filmLuma));

	// Midtone-peaked silver-halide emulsion grain
	float midWeight = 0.35 + 4.0 * filmLuma * (1.0 - filmLuma);
	film = clamp(film + triNoise * 0.036 * midWeight, 0.0, 1.0);

	// Gentle photographic enlarger edge falloff
	vec2 centered = vUv - 0.5;
	float vignette = 1.0 - dot(centered, centered) * 0.22;
	film *= clamp(vignette, 0.86, 1.0);

	// --- 2. XEROX / ZINE PHOTOCOPY PRINT ---
	// Warm charcoal ink (#171513) over uncoated newsprint (#EDE6D8) with crisp
	// angled midtone halftone tooth, solid rich toner shadows, and slight
	// organic registration offset.
	vec3 shifted = sampleBlended(vUv + vec2(0.0014, -0.0011));
	float lumaBase = dot(raw, LUMA);
	float lumaSpot = dot(shifted, LUMA);
	float liftedBase = pow(clamp(lumaBase, 0.0, 1.0), 0.56);
	float liftedSpot = pow(clamp(lumaSpot, 0.0, 1.0), 0.54);
	float boosted = clamp((liftedBase - 0.08) * 1.32, 0.0, 1.0);
	float spotTone = clamp((liftedSpot - 0.10) * 1.35, 0.0, 1.0);

	float pitch = clamp(minDim / 138.0, 3.6, 5.4);
	float dotA = halftone(px, 0.785398, pitch);
	float dotB = halftone(px + vec2(1.2, 0.6), 0.261799, pitch * 1.06);
	// Halftone screen lives in midtones — deep shadows print as rich warm toner,
	// bright highlights stay clean uncoated paper stock.
	float toneMask = smoothstep(0.08, 0.28, boosted) * (1.0 - smoothstep(0.82, 0.98, boosted));
	float midMask = 4.0 * boosted * (1.0 - boosted);

	vec3 xerox = mix(uShadowInk, uSpotInk, smoothstep(0.08, 0.50, spotTone));
	xerox = mix(xerox, uPaper, smoothstep(0.42, 0.84, boosted));

	float screenMod = (dotA * 0.72 + dotB * 0.28 - 0.5) * 0.24 * toneMask * (0.35 + 0.65 * midMask);
	float tonerGrain = triNoise * (0.026 + 0.024 * toneMask);
	xerox = clamp(xerox + screenMod + tonerGrain, 0.0, 1.0);

	vec3 col = mix(film, xerox, uXeroxMix);
	outColor = vec4(col, 1.0);
}`;

interface PlateSpec {
	img: HTMLImageElement;
	shadow: [number, number, number];
	spot: [number, number, number];
	paper: [number, number, number];
	frame: string;
	title: string;
	meta: string;
}

function parseHex(hex: string, fallback: [number, number, number]): [number, number, number] {
	const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return fallback;
	const n = parseInt(m[1], 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function computeCoverCrop(
	img: HTMLImageElement,
	boxW: number,
	boxH: number,
): { scale: [number, number]; offset: [number, number] } {
	const iw = img.naturalWidth || 1;
	const ih = img.naturalHeight || 1;
	const s = Math.max(boxW / iw, boxH / ih);
	const fx = boxW / (iw * s);
	const fy = boxH / (ih * s);
	const style = getComputedStyle(img);
	const parts = style.objectPosition.split(' ');
	const px = parts[0]?.endsWith('%') ? parseFloat(parts[0]) / 100 : 0.5;
	const py = parts[1]?.endsWith('%') ? parseFloat(parts[1]) / 100 : 0.5;
	return {
		scale: [fx, fy],
		offset: [(1 - fx) * px, (1 - fy) * (1 - py)],
	};
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const err = gl.getShaderInfoLog(shader) || 'Shader compile error';
		gl.deleteShader(shader);
		throw new Error(err);
	}
	return shader;
}

export function mountPosterStage(root: HTMLElement): () => void {
	const stageEl = root.querySelector<HTMLElement>('[data-poster-stage]');
	const nextBtn = root.querySelector<HTMLButtonElement>('[data-poster-next]');
	const canvas = root.querySelector<HTMLCanvasElement>('[data-poster-canvas]');
	const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('[data-poster-img]'));
	const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-plate-btn]'));
	const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-print-mode]'));
	const titleEls = Array.from(root.querySelectorAll<HTMLElement>('[data-poster-title]'));
	const metaEls = Array.from(root.querySelectorAll<HTMLElement>('[data-poster-meta]'));
	const frameEls = Array.from(root.querySelectorAll<HTMLElement>('[data-poster-frame]'));

	if (!stageEl || !imgs.length) return () => {};

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let activeIndex = 0;
	let prevIndex = 0;
	let xeroxMode = false;
	let destroyed = false;

	const plates: PlateSpec[] = imgs.map((img, i) => ({
		img,
		shadow: parseHex(img.dataset.shadow || '#171513', [0.09, 0.082, 0.075]),
		spot: parseHex(img.dataset.spot || '#534C43', [0.325, 0.298, 0.263]),
		paper: parseHex(img.dataset.paper || '#EDE6D8', [0.929, 0.902, 0.847]),
		frame: img.dataset.frame || `0${i + 1}A`,
		title: img.dataset.title || '',
		meta: img.dataset.meta || '',
	}));

	const updateDOMState = () => {
		imgs.forEach((img, idx) => {
			img.classList.toggle('is-active', idx === activeIndex);
		});
		buttons.forEach((btn, idx) => {
			const on = idx === activeIndex;
			btn.classList.toggle('is-active', on);
			btn.setAttribute('aria-pressed', String(on));
		});

		const p = plates[activeIndex];
		titleEls.forEach((el) => {
			el.textContent = p.title;
		});
		metaEls.forEach((el) => {
			el.textContent = p.meta;
		});
		frameEls.forEach((el) => {
			el.textContent = p.frame;
		});

		const modeName = xeroxMode ? 'xerox' : 'color';
		root.dataset.printMode = modeName;
		modeButtons.forEach((btn) => {
			const active = btn.dataset.printMode === modeName;
			btn.classList.toggle('is-active', active);
			btn.setAttribute('aria-pressed', String(active));
		});
	};

	updateDOMState();

	// WebGL2 state
	let gl: WebGL2RenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let vao: WebGLVertexArrayObject | null = null;
	const uniforms = new Map<string, WebGLUniformLocation>();
	const textures: Array<WebGLTexture | null> = plates.map(() => null);
	let raf = 0;
	let visible = true;
	let needsRender = true;

	let crossfade = 1;
	let xeroxMix = 0;
	let currShadow: [number, number, number] = [...plates[0].shadow];
	let currSpot: [number, number, number] = [...plates[0].spot];
	let currPaper: [number, number, number] = [...plates[0].paper];

	const initGL = () => {
		if (!canvas || !('WebGL2RenderingContext' in window)) return false;
		if (new URLSearchParams(window.location.search).get('darkroom') === '0') return false;
		const ctx = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'default',
		});
		if (!ctx) return false;

		try {
			const vs = compileShader(ctx, ctx.VERTEX_SHADER, VERT);
			const fs = compileShader(ctx, ctx.FRAGMENT_SHADER, FRAG);
			const prog = ctx.createProgram()!;
			ctx.attachShader(prog, vs);
			ctx.attachShader(prog, fs);
			ctx.linkProgram(prog);
			ctx.deleteShader(vs);
			ctx.deleteShader(fs);
			if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
				throw new Error(ctx.getProgramInfoLog(prog) || 'Link failed');
			}

			gl = ctx;
			program = prog;
			vao = ctx.createVertexArray();
			const count = ctx.getProgramParameter(prog, ctx.ACTIVE_UNIFORMS) as number;
			for (let i = 0; i < count; i++) {
				const info = ctx.getActiveUniform(prog, i);
				const loc = info && ctx.getUniformLocation(prog, info.name);
				if (info && loc) uniforms.set(info.name, loc);
			}
			return true;
		} catch {
			return false;
		}
	};

	const uploadTexture = (index: number): WebGLTexture | null => {
		if (!gl || destroyed) return null;
		if (textures[index]) return textures[index];
		const img = plates[index].img;
		if (!img.complete || !img.naturalWidth) return null;

		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		textures[index] = tex;
		return tex;
	};

	const resizeCanvas = () => {
		if (!canvas || !stageEl) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(1, Math.round(stageEl.clientWidth * dpr));
		const h = Math.max(1, Math.round(stageEl.clientHeight * dpr));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			needsRender = true;
		}
	};

	const glReady = initGL();

	const drawFrame = (): boolean => {
		if (!gl || !program || !canvas || !vao) return false;
		const texB = uploadTexture(activeIndex);
		if (!texB) return false;
		const prevTex = uploadTexture(prevIndex);
		const idxA = prevTex ? prevIndex : activeIndex;
		const texA = prevTex || texB;

		if (!stageEl.classList.contains('is-webgl-live')) {
			stageEl.classList.add('is-webgl-live');
		}

		const w = canvas.width;
		const h = canvas.height;
		const boxW = stageEl.clientWidth || 1;
		const boxH = stageEl.clientHeight || 1;
		const cropA = computeCoverCrop(plates[idxA].img, boxW, boxH);
		const cropB = computeCoverCrop(plates[activeIndex].img, boxW, boxH);

		gl.viewport(0, 0, w, h);
		gl.useProgram(program);
		gl.bindVertexArray(vao);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texA);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, texB);

		gl.uniform1i(uniforms.get('uTexA')!, 0);
		gl.uniform1i(uniforms.get('uTexB')!, 1);
		gl.uniform1f(uniforms.get('uMix')!, crossfade);
		gl.uniform2f(uniforms.get('uCropScaleA')!, cropA.scale[0], cropA.scale[1]);
		gl.uniform2f(uniforms.get('uCropOffsetA')!, cropA.offset[0], cropA.offset[1]);
		gl.uniform2f(uniforms.get('uCropScaleB')!, cropB.scale[0], cropB.scale[1]);
		gl.uniform2f(uniforms.get('uCropOffsetB')!, cropB.offset[0], cropB.offset[1]);
		gl.uniform2f(uniforms.get('uRes')!, w, h);
		gl.uniform1f(uniforms.get('uXeroxMix')!, xeroxMix);
		gl.uniform3f(uniforms.get('uShadowInk')!, currShadow[0], currShadow[1], currShadow[2]);
		gl.uniform3f(uniforms.get('uSpotInk')!, currSpot[0], currSpot[1], currSpot[2]);
		gl.uniform3f(uniforms.get('uPaper')!, currPaper[0], currPaper[1], currPaper[2]);

		gl.drawArrays(gl.TRIANGLES, 0, 3);
		return true;
	};

	const vecSettled = (a: [number, number, number], b: [number, number, number]) =>
		Math.abs(a[0] - b[0]) < 0.002 &&
		Math.abs(a[1] - b[1]) < 0.002 &&
		Math.abs(a[2] - b[2]) < 0.002;

	const tick = () => {
		raf = 0;
		if (destroyed || !glReady || !visible) return;

		const targetImg = plates[activeIndex].img;
		const targetReady = Boolean(textures[activeIndex] || (targetImg.complete && targetImg.naturalWidth));
		if (!targetReady) {
			// Wait for the image's `load` listener to kick() — never spin rAF at 60fps
			// while waiting on network decode or if an image fails to load.
			needsRender = !targetImg.complete;
			return;
		}

		const targetPlate = plates[activeIndex];
		const ease = reduced ? 1 : 0.16;

		const targetXerox = xeroxMode ? 1 : 0;
		xeroxMix += (targetXerox - xeroxMix) * ease;

		if (crossfade < 1) {
			crossfade = reduced ? 1 : Math.min(1, crossfade + 0.085);
		}

		for (let i = 0; i < 3; i++) {
			currShadow[i] += (targetPlate.shadow[i] - currShadow[i]) * ease;
			currSpot[i] += (targetPlate.spot[i] - currSpot[i]) * ease;
			currPaper[i] += (targetPlate.paper[i] - currPaper[i]) * ease;
		}

		const drew = drawFrame();

		const settled =
			drew &&
			Math.abs(targetXerox - xeroxMix) < 0.002 &&
			crossfade >= 0.999 &&
			vecSettled(targetPlate.spot, currSpot) &&
			vecSettled(targetPlate.shadow, currShadow) &&
			vecSettled(targetPlate.paper, currPaper);

		needsRender = !settled;
		if (!reduced && !settled && visible && !destroyed) {
			raf = requestAnimationFrame(tick);
		}
	};

	const kick = () => {
		if (destroyed || !glReady || !visible) return;
		needsRender = true;
		if (!raf) raf = requestAnimationFrame(tick);
	};

	const selectPlate = (idx: number) => {
		const next = ((idx % plates.length) + plates.length) % plates.length;
		if (next === activeIndex) return;
		prevIndex = activeIndex;
		activeIndex = next;
		const nextImg = plates[activeIndex].img;
		if (nextImg.loading === 'lazy') nextImg.loading = 'eager';
		crossfade = reduced ? 1 : 0;
		updateDOMState();
		kick();
	};

	const setPrintMode = (nextXerox: boolean) => {
		if (xeroxMode === nextXerox) return;
		xeroxMode = nextXerox;
		updateDOMState();
		kick();
	};

	// Bind contact-sheet plate buttons
	const btnHandlers: Array<[HTMLButtonElement, () => void]> = buttons.map((btn, idx) => {
		const fn = () => selectPlate(idx);
		btn.addEventListener('click', fn);
		return [btn, fn];
	});

	// Bind COLOR / XEROX segmented print mode buttons
	const modeHandlers: Array<[HTMLButtonElement, () => void]> = modeButtons.map((btn) => {
		const fn = () => setPrintMode(btn.dataset.printMode === 'xerox');
		btn.addEventListener('click', fn);
		return [btn, fn];
	});

	// Dedicated full-bleed button advances to the next contact-sheet frame without intercepting link keys
	const onNextClick = () => {
		selectPlate(activeIndex + 1);
	};
	nextBtn?.addEventListener('click', onNextClick);

	// Image load listeners so WebGL paints as soon as the active image is decoded
	const imgHandlers: Array<[HTMLImageElement, () => void]> = imgs.map((img) => {
		const fn = () => {
			resizeCanvas();
			kick();
		};
		if (img.complete && img.naturalWidth) {
			queueMicrotask(fn);
		} else {
			img.addEventListener('load', fn, { once: true });
		}
		return [img, fn];
	});

	const resizeObserver = new ResizeObserver(() => {
		resizeCanvas();
		kick();
	});
	resizeObserver.observe(stageEl);

	const io = new IntersectionObserver(
		(entries) => {
			visible = Boolean(entries[0]?.isIntersecting);
			if (visible && needsRender) kick();
		},
		{ threshold: 0.05 },
	);
	io.observe(stageEl);

	const onVisibility = () => {
		if (document.visibilityState === 'visible' && visible) kick();
	};
	document.addEventListener('visibilitychange', onVisibility);

	const onContextLost = (e: Event) => {
		e.preventDefault();
		stageEl.classList.remove('is-webgl-live');
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	};
	canvas?.addEventListener('webglcontextlost', onContextLost);

	resizeCanvas();
	kick();

	return () => {
		destroyed = true;
		if (raf) cancelAnimationFrame(raf);
		resizeObserver.disconnect();
		io.disconnect();
		document.removeEventListener('visibilitychange', onVisibility);
		nextBtn?.removeEventListener('click', onNextClick);
		canvas?.removeEventListener('webglcontextlost', onContextLost);
		btnHandlers.forEach(([b, fn]) => b.removeEventListener('click', fn));
		modeHandlers.forEach(([b, fn]) => b.removeEventListener('click', fn));
		imgHandlers.forEach(([img, fn]) => img.removeEventListener('load', fn));
		if (gl) {
			textures.forEach((t) => t && gl!.deleteTexture(t));
			if (program) gl.deleteProgram(program);
			if (vao) gl.deleteVertexArray(vao);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		}
	};
}
