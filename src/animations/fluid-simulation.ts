/**
 * fluid-simulation.ts
 * GPU-accelerated 2D Navier-Stokes fluid solver for interactive ink effects.
 * WebGL 2 required. Falls back gracefully when unavailable.
 */

// ---- Configuration ----

const SIM_RES = 128;
const DYE_RES = 1024;
const PRESSURE_ITERS = 20;
const CURL_STRENGTH = 35;
const SPLAT_RADIUS = 0.005;
const SPLAT_FORCE = 6000;
const VEL_DISSIPATION = 0.98;
const DYE_DISSIPATION = 0.985;
const PRESSURE_DISSIPATION = 0.8;
const IDLE_TIMEOUT = 3000;
const IDLE_SPLAT_INTERVAL = 800;
const INITIAL_SPLATS = 6;

const PALETTE: [number, number, number][] = [
	[0.7, 0.08, 0.08],
	[0.9, 0.14, 0.14],
	[0.5, 0.06, 0.06],
	[0.15, 0.06, 0.06],
];

// ---- Shader sources ----

const VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SPLAT_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
void main () {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
void main () {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
  vec4 result = uDissipation * texture2D(uSource, coord);
  gl_FragColor = result;
}`;

const DIVERGENCE_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
void main () {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const CURL_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
void main () {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float curl = 0.5 * (R - L - T + B);
  gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDt;
void main () {
  float L = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 N = vec2(abs(R) - abs(L), abs(T) - abs(B));
  N /= length(N) + 1e-5;
  vec2 force = uCurlStrength * C * vec2(N.y, -N.x);
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
void main () {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  float p = (L + R + B + T - div) * 0.25;
  gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
}`;

const GRAD_SUBTRACT_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
void main () {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}`;

const CLEAR_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uValue;
void main () {
  gl_FragColor = uValue * texture2D(uTexture, vUv);
}`;

const DISPLAY_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;
  float ink = max(c.r, max(c.g, c.b));
  float alpha = smoothstep(0.002, 0.12, ink);
  gl_FragColor = vec4(c * alpha, alpha);
}`;

// ---- Types ----

interface Program {
	program: WebGLProgram;
	uniforms: Record<string, WebGLUniformLocation | null>;
}

interface FBO {
	texture: WebGLTexture;
	fbo: WebGLFramebuffer;
	width: number;
	height: number;
	texelSizeX: number;
	texelSizeY: number;
}

interface DoubleFBO {
	width: number;
	height: number;
	texelSizeX: number;
	texelSizeY: number;
	read: FBO;
	write: FBO;
	swap(): void;
}

interface Pointer {
	x: number;
	y: number;
	dx: number;
	dy: number;
	moved: boolean;
	down: boolean;
}

// ---- WebGL helpers ----

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile error: ${info}`);
	}
	return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): Program {
	const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
	const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
	}
	const uniforms: Record<string, WebGLUniformLocation | null> = {};
	const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	for (let i = 0; i < count; i++) {
		const info = gl.getActiveUniform(program, i);
		if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
	}
	return { program, uniforms };
}

function createFBO(gl: WebGL2RenderingContext, w: number, h: number): FBO {
	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);

	const fbo = gl.createFramebuffer()!;
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.viewport(0, 0, w, h);
	gl.clear(gl.COLOR_BUFFER_BIT);

	return { texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h };
}

function createDoubleFBO(gl: WebGL2RenderingContext, w: number, h: number): DoubleFBO {
	let fbo1 = createFBO(gl, w, h);
	let fbo2 = createFBO(gl, w, h);
	return {
		width: w,
		height: h,
		texelSizeX: 1 / w,
		texelSizeY: 1 / h,
		get read() { return fbo1; },
		get write() { return fbo2; },
		swap() { const tmp = fbo1; fbo1 = fbo2; fbo2 = tmp; },
	};
}

function testFBOSupport(gl: WebGL2RenderingContext): boolean {
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
	const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	gl.deleteFramebuffer(fb);
	gl.deleteTexture(tex);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	return status === gl.FRAMEBUFFER_COMPLETE;
}

// ---- Simulation class ----

export class FluidSimulation {
	readonly supported: boolean;

	private canvas: HTMLCanvasElement;
	private gl: WebGL2RenderingContext | null = null;

	private programs!: {
		splat: Program;
		advection: Program;
		divergence: Program;
		curl: Program;
		vorticity: Program;
		pressure: Program;
		gradSubtract: Program;
		clear: Program;
		display: Program;
	};

	private velocity!: DoubleFBO;
	private dye!: DoubleFBO;
	private pressure!: DoubleFBO;
	private divergenceFBO!: FBO;
	private curlFBO!: FBO;

	private quadVAO!: WebGLVertexArrayObject;
	private pointer: Pointer = { x: -1, y: -1, dx: 0, dy: 0, moved: false, down: false };
	private rafId = 0;
	private lastTime = 0;
	private running = false;
	private lastInteraction = 0;
	private nextIdleSplat = 0;
	private hasSplashedInitial = false;
	private resizeObserver: ResizeObserver | null = null;
	private boundHandlers: Array<[EventTarget, string, EventListener]> = [];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.supported = this.init();
	}

	private init(): boolean {
		const gl = this.canvas.getContext('webgl2', {
			alpha: true,
			depth: false,
			stencil: false,
			antialias: false,
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
		}) as WebGL2RenderingContext | null;

		if (!gl) return false;
		this.gl = gl;

		gl.getExtension('EXT_color_buffer_float');
		if (!testFBOSupport(gl)) return false;

		gl.disable(gl.BLEND);

		this.compilePrograms();
		this.createQuad();
		this.resize();
		this.bindPointer();

		return true;
	}

	private compilePrograms() {
		const gl = this.gl!;
		this.programs = {
			splat: createProgram(gl, VERT, SPLAT_FRAG),
			advection: createProgram(gl, VERT, ADVECTION_FRAG),
			divergence: createProgram(gl, VERT, DIVERGENCE_FRAG),
			curl: createProgram(gl, VERT, CURL_FRAG),
			vorticity: createProgram(gl, VERT, VORTICITY_FRAG),
			pressure: createProgram(gl, VERT, PRESSURE_FRAG),
			gradSubtract: createProgram(gl, VERT, GRAD_SUBTRACT_FRAG),
			clear: createProgram(gl, VERT, CLEAR_FRAG),
			display: createProgram(gl, VERT, DISPLAY_FRAG),
		};
	}

	private createQuad() {
		const gl = this.gl!;
		const vao = gl.createVertexArray()!;
		gl.bindVertexArray(vao);
		const buf = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 3, 3, -1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
		this.quadVAO = vao;
	}

	private resize() {
		const gl = this.gl!;
		const rect = this.canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.floor(rect.width * dpr);
		const h = Math.floor(rect.height * dpr);
		if (w === 0 || h === 0) return;
		if (this.canvas.width === w && this.canvas.height === h) return;

		this.canvas.width = w;
		this.canvas.height = h;
		this.initFBOs();
	}

	private initFBOs() {
		const gl = this.gl!;
		const aspect = this.canvas.width / this.canvas.height;
		const simW = Math.ceil(SIM_RES * aspect);
		const simH = SIM_RES;
		const dyeW = Math.ceil(DYE_RES * aspect);
		const dyeH = DYE_RES;

		this.velocity = createDoubleFBO(gl, simW, simH);
		this.pressure = createDoubleFBO(gl, simW, simH);
		this.divergenceFBO = createFBO(gl, simW, simH);
		this.curlFBO = createFBO(gl, simW, simH);
		this.dye = createDoubleFBO(gl, dyeW, dyeH);
	}

	// ---- Pointer ----

	private bindPointer() {
		const onMove = (clientX: number, clientY: number) => {
			const rect = this.canvas.getBoundingClientRect();
			const x = (clientX - rect.left) / rect.width;
			const y = 1 - (clientY - rect.top) / rect.height;
			if (this.pointer.x >= 0) {
				this.pointer.dx = x - this.pointer.x;
				this.pointer.dy = y - this.pointer.y;
				this.pointer.moved = true;
			}
			this.pointer.x = x;
			this.pointer.y = y;
			this.lastInteraction = performance.now();
		};

		const mouseMove = (e: Event) => {
			const me = e as MouseEvent;
			onMove(me.clientX, me.clientY);
		};
		const touchMove = (e: Event) => {
			const te = e as TouchEvent;
			e.preventDefault();
			const t = te.touches[0];
			if (t) onMove(t.clientX, t.clientY);
		};
		const mouseDown = () => { this.pointer.down = true; };
		const mouseUp = () => { this.pointer.down = false; };
		const touchStart = (e: Event) => {
			const te = e as TouchEvent;
			this.pointer.down = true;
			const t = te.touches[0];
			if (t) onMove(t.clientX, t.clientY);
		};
		const touchEnd = () => {
			this.pointer.down = false;
			this.pointer.moved = false;
		};
		const mouseLeave = () => {
			this.pointer.x = -1;
			this.pointer.moved = false;
		};

		const listen = (el: EventTarget, evt: string, fn: EventListener, opts?: AddEventListenerOptions) => {
			el.addEventListener(evt, fn, opts);
			this.boundHandlers.push([el, evt, fn]);
		};

		listen(this.canvas, 'mousemove', mouseMove, { passive: true });
		listen(this.canvas, 'mousedown', mouseDown as EventListener);
		listen(this.canvas, 'touchmove', touchMove, { passive: false });
		listen(this.canvas, 'touchstart', touchStart, { passive: true });
		listen(window, 'mouseup', mouseUp as EventListener);
		listen(window, 'touchend', touchEnd as EventListener);
		listen(this.canvas, 'mouseleave', mouseLeave as EventListener);
	}

	// ---- Lifecycle ----

	start() {
		if (this.running || !this.supported) return;
		this.running = true;
		this.lastTime = performance.now();
		this.lastInteraction = performance.now();

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.canvas);

		this.update();
	}

	stop() {
		this.running = false;
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = 0;
		}
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
	}

	destroy() {
		this.stop();
		for (const [el, evt, fn] of this.boundHandlers) {
			el.removeEventListener(evt, fn);
		}
		this.boundHandlers = [];
		if (this.gl) {
			const loseCtx = this.gl.getExtension('WEBGL_lose_context');
			loseCtx?.loseContext();
		}
		this.gl = null;
	}

	// ---- Render loop ----

	private update() {
		if (!this.running) return;
		const now = performance.now();
		const dt = Math.min((now - this.lastTime) / 1000, 0.033);
		this.lastTime = now;

		this.resize();

		if (this.pointer.moved) {
			this.pointer.moved = false;
			this.splatAt(
				this.pointer.x,
				this.pointer.y,
				this.pointer.dx * SPLAT_FORCE,
				this.pointer.dy * SPLAT_FORCE,
				this.randomColor(),
			);
		}

		if (!this.hasSplashedInitial) {
			this.hasSplashedInitial = true;
			this.spawnInitialSplats();
		}

		this.updateIdle(now);
		this.step(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.update());
	}

	private updateIdle(now: number) {
		const idle = now - this.lastInteraction;
		if (idle < IDLE_TIMEOUT) return;
		if (now < this.nextIdleSplat) return;

		this.nextIdleSplat = now + IDLE_SPLAT_INTERVAL + Math.random() * 600;
		const x = 0.15 + Math.random() * 0.7;
		const y = 0.15 + Math.random() * 0.7;
		const angle = Math.random() * Math.PI * 2;
		const mag = 200 + Math.random() * 400;
		this.splatAt(x, y, Math.cos(angle) * mag, Math.sin(angle) * mag, this.randomColor());
	}

	private spawnInitialSplats() {
		for (let i = 0; i < INITIAL_SPLATS; i++) {
			const x = 0.1 + Math.random() * 0.8;
			const y = 0.1 + Math.random() * 0.8;
			const angle = Math.random() * Math.PI * 2;
			const mag = 600 + Math.random() * 1200;
			this.splatAt(x, y, Math.cos(angle) * mag, Math.sin(angle) * mag, this.randomColor());
		}
	}

	private randomColor(): [number, number, number] {
		return PALETTE[Math.floor(Math.random() * PALETTE.length)];
	}

	// ---- Simulation step ----

	private step(dt: number) {
		const gl = this.gl!;
		gl.bindVertexArray(this.quadVAO);

		// Curl
		this.use(this.programs.curl);
		gl.uniform2f(this.programs.curl.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		this.bindTex(this.programs.curl, 'uVelocity', this.velocity.read.texture, 0);
		this.blit(this.curlFBO);

		// Vorticity confinement
		this.use(this.programs.vorticity);
		gl.uniform2f(this.programs.vorticity.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1f(this.programs.vorticity.uniforms['uCurlStrength']!, CURL_STRENGTH);
		gl.uniform1f(this.programs.vorticity.uniforms['uDt']!, dt);
		this.bindTex(this.programs.vorticity, 'uVelocity', this.velocity.read.texture, 0);
		this.bindTex(this.programs.vorticity, 'uCurl', this.curlFBO.texture, 1);
		this.blit(this.velocity.write);
		this.velocity.swap();

		// Advect velocity
		this.use(this.programs.advection);
		gl.uniform2f(this.programs.advection.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1f(this.programs.advection.uniforms['uDt']!, dt);
		gl.uniform1f(this.programs.advection.uniforms['uDissipation']!, VEL_DISSIPATION);
		this.bindTex(this.programs.advection, 'uVelocity', this.velocity.read.texture, 0);
		this.bindTex(this.programs.advection, 'uSource', this.velocity.read.texture, 1);
		this.blit(this.velocity.write);
		this.velocity.swap();

		// Advect dye
		this.use(this.programs.advection);
		gl.uniform2f(this.programs.advection.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		gl.uniform1f(this.programs.advection.uniforms['uDt']!, dt);
		gl.uniform1f(this.programs.advection.uniforms['uDissipation']!, DYE_DISSIPATION);
		this.bindTex(this.programs.advection, 'uVelocity', this.velocity.read.texture, 0);
		this.bindTex(this.programs.advection, 'uSource', this.dye.read.texture, 1);
		this.blit(this.dye.write);
		this.dye.swap();

		// Divergence
		this.use(this.programs.divergence);
		gl.uniform2f(this.programs.divergence.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		this.bindTex(this.programs.divergence, 'uVelocity', this.velocity.read.texture, 0);
		this.blit(this.divergenceFBO);

		// Clear pressure
		this.use(this.programs.clear);
		this.bindTex(this.programs.clear, 'uTexture', this.pressure.read.texture, 0);
		gl.uniform1f(this.programs.clear.uniforms['uValue']!, PRESSURE_DISSIPATION);
		this.blit(this.pressure.write);
		this.pressure.swap();

		// Pressure solve (Jacobi iterations)
		this.use(this.programs.pressure);
		gl.uniform2f(this.programs.pressure.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		this.bindTex(this.programs.pressure, 'uDivergence', this.divergenceFBO.texture, 1);
		for (let i = 0; i < PRESSURE_ITERS; i++) {
			this.bindTex(this.programs.pressure, 'uPressure', this.pressure.read.texture, 0);
			this.blit(this.pressure.write);
			this.pressure.swap();
		}

		// Gradient subtraction
		this.use(this.programs.gradSubtract);
		gl.uniform2f(this.programs.gradSubtract.uniforms['uTexelSize']!, this.velocity.texelSizeX, this.velocity.texelSizeY);
		this.bindTex(this.programs.gradSubtract, 'uPressure', this.pressure.read.texture, 0);
		this.bindTex(this.programs.gradSubtract, 'uVelocity', this.velocity.read.texture, 1);
		this.blit(this.velocity.write);
		this.velocity.swap();

		gl.bindVertexArray(null);
	}

	// ---- Splat ----

	private splatAt(x: number, y: number, dx: number, dy: number, color: [number, number, number]) {
		const gl = this.gl!;
		gl.bindVertexArray(this.quadVAO);

		const aspect = this.canvas.width / this.canvas.height;

		// Velocity splat
		this.use(this.programs.splat);
		gl.uniform1f(this.programs.splat.uniforms['uAspectRatio']!, aspect);
		gl.uniform2f(this.programs.splat.uniforms['uPoint']!, x, y);
		gl.uniform1f(this.programs.splat.uniforms['uRadius']!, SPLAT_RADIUS);
		gl.uniform3f(this.programs.splat.uniforms['uColor']!, dx, dy, 0);
		this.bindTex(this.programs.splat, 'uTarget', this.velocity.read.texture, 0);
		this.blit(this.velocity.write);
		this.velocity.swap();

		// Dye splat
		this.use(this.programs.splat);
		gl.uniform3f(this.programs.splat.uniforms['uColor']!, color[0], color[1], color[2]);
		this.bindTex(this.programs.splat, 'uTarget', this.dye.read.texture, 0);
		this.blit(this.dye.write);
		this.dye.swap();

		gl.bindVertexArray(null);
	}

	// ---- Display ----

	private render() {
		const gl = this.gl!;
		gl.bindVertexArray(this.quadVAO);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		this.use(this.programs.display);
		this.bindTex(this.programs.display, 'uTexture', this.dye.read.texture, 0);
		this.blit(null);

		gl.disable(gl.BLEND);
		gl.bindVertexArray(null);
	}

	// ---- GL utilities ----

	private use(prog: Program) {
		this.gl!.useProgram(prog.program);
	}

	private bindTex(prog: Program, name: string, texture: WebGLTexture, unit: number) {
		const gl = this.gl!;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(prog.uniforms[name]!, unit);
	}

	private blit(target: FBO | null) {
		const gl = this.gl!;
		if (target) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
			gl.viewport(0, 0, target.width, target.height);
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}
}
