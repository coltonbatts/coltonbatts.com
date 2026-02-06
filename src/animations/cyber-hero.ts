/**
 * cyber-hero.ts
 * GPU-accelerated cyber-futuristic hero animation with:
 * - Swirling fluid gradients (cyan, magenta, indigo)
 * - Multiple glassmorphism layers with frosted effects
 * - Post-processing: scanlines, chromatic aberration, screen curvature
 * - Auto-animated cursor with ripple/defrost/bloom effects
 * WebGL 2 required.
 */

// ---- Configuration ----

const FLUID_RES = 512;
const LOOP_DURATION = 13.5; // seconds for perfect loop
const CURSOR_SPEED = 0.00012; // Slow, lazy cursor movement
const RIPPLE_RADIUS = 0.15;
const RIPPLE_STRENGTH = 0.4;
const DEFROST_RADIUS = 0.12;
const BLOOM_INTENSITY = 0.35;
const SCANLINE_INTENSITY = 0.04;
const CHROMATIC_STRENGTH = 0.003;
const CURVATURE_STRENGTH = 0.02;
const FROST_AMOUNT = 0.65;
const PARTICLE_COUNT = 24;
const PARTICLE_FADE = 0.92;

// Color palette: electric cyan, hot magenta, deep indigo
const COLORS = {
	cyan: [0.0, 0.85, 1.0],
	magenta: [1.0, 0.1, 0.65],
	indigo: [0.25, 0.1, 0.85],
	purple: [0.55, 0.15, 0.95],
};

// ---- Shader Sources ----

const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Fluid base layer - swirling organic gradients
const FLUID_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uLoopTime;
uniform vec2 uResolution;

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
	const vec2 C = vec2(1.0/6.0, 1.0/3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);
	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy;
	vec3 x3 = x0 - D.yyy;
	i = mod289(i);
	vec4 p = permute(permute(permute(
		i.z + vec4(0.0, i1.z, i2.z, 1.0))
		+ i.y + vec4(0.0, i1.y, i2.y, 1.0))
		+ i.x + vec4(0.0, i1.x, i2.x, 1.0));
	float n_ = 0.142857142857;
	vec3 ns = n_ * D.wyz - D.xzx;
	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);
	vec4 x = x_ *ns.x + ns.yyyy;
	vec4 y = y_ *ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);
	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);
	vec4 s0 = floor(b0)*2.0 + 1.0;
	vec4 s1 = floor(b1)*2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));
	vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);
	vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
	p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
	vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
	m = m * m;
	return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
	float f = 0.0;
	f += 0.5000 * snoise(p); p *= 2.01;
	f += 0.2500 * snoise(p); p *= 2.02;
	f += 0.1250 * snoise(p); p *= 2.03;
	f += 0.0625 * snoise(p);
	return f;
}

void main() {
	vec2 uv = vUv;
	float t = uLoopTime;
	
	// Create swirling motion with multiple noise layers
	float angle = t * 0.3;
	vec2 center = vec2(0.5);
	vec2 offset = uv - center;
	
	// Rotation matrix for swirl
	float s = sin(angle);
	float c = cos(angle);
	vec2 rotated = vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);
	
	// Multiple noise layers for organic flow
	vec3 p1 = vec3(rotated * 2.0 + t * 0.15, t * 0.1);
	vec3 p2 = vec3(uv * 3.0 - t * 0.08, t * 0.15 + 10.0);
	vec3 p3 = vec3(rotated * 1.5 + t * 0.12, t * 0.08 + 20.0);
	
	float n1 = fbm(p1);
	float n2 = fbm(p2);
	float n3 = fbm(p3);
	
	// Distort UV for fluid-like tendrils
	vec2 distort = vec2(
		snoise(vec3(uv * 4.0, t * 0.2)) * 0.15,
		snoise(vec3(uv * 4.0 + 50.0, t * 0.2)) * 0.15
	);
	
	vec2 flowUv = uv + distort;
	
	// Color mixing based on noise
	vec3 cyan = vec3(0.0, 0.85, 1.0);
	vec3 magenta = vec3(1.0, 0.1, 0.65);
	vec3 indigo = vec3(0.25, 0.1, 0.85);
	vec3 purple = vec3(0.55, 0.15, 0.95);
	
	float blend1 = smoothstep(-0.3, 0.5, n1);
	float blend2 = smoothstep(-0.2, 0.6, n2);
	float blend3 = smoothstep(-0.4, 0.4, n3);
	
	vec3 color = mix(indigo, cyan, blend1);
	color = mix(color, magenta, blend2 * 0.7);
	color = mix(color, purple, blend3 * 0.5);
	
	// Add bright spots for energy currents
	float energy = pow(max(0.0, n1 + n2 * 0.5), 3.0) * 2.0;
	color += vec3(0.3, 0.6, 1.0) * energy;
	
	// Soft vignette
	float vignette = 1.0 - length(offset) * 0.5;
	color *= vignette;
	
	// Intensity modulation
	float intensity = 0.6 + 0.4 * sin(t * 0.5);
	color *= intensity;
	
	fragColor = vec4(color, 1.0);
}`;

// Glassmorphism layer with frosted effect
const GLASS_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uFluid;
uniform float uTime;
uniform float uLoopTime;
uniform vec2 uResolution;
uniform vec2 uCursor;
uniform float uCursorActive;

// Noise for glass distortion
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
	vec2 uv = vUv;
	float t = uLoopTime;
	
	// Glass panel shapes - multiple translucent orbs/panels
	float glass = 0.0;
	
	// Panel 1 - large floating orb
	vec2 p1Center = vec2(0.3 + sin(t * 0.2) * 0.1, 0.6 + cos(t * 0.15) * 0.1);
	float d1 = length(uv - p1Center);
	float panel1 = smoothstep(0.35, 0.2, d1);
	
	// Panel 2 - smaller orb
	vec2 p2Center = vec2(0.7 + cos(t * 0.25) * 0.08, 0.4 + sin(t * 0.2) * 0.08);
	float d2 = length(uv - p2Center);
	float panel2 = smoothstep(0.25, 0.12, d2);
	
	// Panel 3 - elongated panel
	vec2 p3Center = vec2(0.5, 0.3 + sin(t * 0.18) * 0.1);
	vec2 p3Offset = uv - p3Center;
	float d3 = length(p3Offset * vec2(1.5, 1.0));
	float panel3 = smoothstep(0.3, 0.15, d3);
	
	glass = max(max(panel1, panel2), panel3);
	
	// Frosted blur effect - sample multiple nearby pixels
	vec2 texelSize = 1.0 / uResolution;
	float frostAmount = ${FROST_AMOUNT};
	
	// Cursor defrost effect - clear the frost near cursor
	float cursorDist = length(uv - uCursor);
	float defrost = smoothstep(${DEFROST_RADIUS}, 0.0, cursorDist) * uCursorActive;
	frostAmount *= (1.0 - defrost * 0.85);
	
	vec3 blurred = vec3(0.0);
	float samples = 0.0;
	for (float x = -3.0; x <= 3.0; x += 1.0) {
		for (float y = -3.0; y <= 3.0; y += 1.0) {
			vec2 offset = vec2(x, y) * texelSize * 8.0 * frostAmount * glass;
			// Add noise-based distortion for organic frost
			offset += vec2(noise(uv * 20.0 + t), noise(uv * 20.0 + 100.0 + t)) * texelSize * 4.0 * glass;
			blurred += texture(uFluid, uv + offset).rgb;
			samples += 1.0;
		}
	}
	blurred /= samples;
	
	// Sharp fluid under defrosted areas
	vec3 sharp = texture(uFluid, uv).rgb;
	vec3 fluid = mix(blurred, sharp, defrost);
	
	// Glass edge highlights
	float edge1 = smoothstep(0.3, 0.28, d1) - smoothstep(0.28, 0.26, d1);
	float edge2 = smoothstep(0.22, 0.2, d2) - smoothstep(0.2, 0.18, d2);
	float edge3 = smoothstep(0.27, 0.25, d3) - smoothstep(0.25, 0.23, d3);
	float edges = (edge1 + edge2 + edge3) * 0.5;
	
	// Inner glow
	float innerGlow = glass * 0.15;
	
	// Specular reflection / light leak
	float spec = pow(max(0.0, 1.0 - d1 * 3.0), 8.0) * 0.3;
	spec += pow(max(0.0, 1.0 - d2 * 4.0), 6.0) * 0.2;
	
	// Cursor ripple highlight in glass
	float ripple = sin(cursorDist * 40.0 - t * 8.0) * 0.5 + 0.5;
	ripple *= smoothstep(${RIPPLE_RADIUS}, 0.0, cursorDist) * uCursorActive * ${RIPPLE_STRENGTH};
	
	// Combine
	vec3 color = fluid;
	color += vec3(0.6, 0.8, 1.0) * edges; // White-blue edge highlights
	color += vec3(0.4, 0.6, 1.0) * innerGlow; // Inner glow
	color += vec3(1.0) * spec; // Specular
	color += vec3(0.5, 0.8, 1.0) * ripple * glass; // Ripple in glass
	
	// Refractive distortion intensity
	float refract = glass * 0.3;
	
	fragColor = vec4(color, glass * 0.4 + refract);
}`;

// Post-processing: scanlines, chromatic aberration, curvature, bloom
const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uParticles;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uCursor;
uniform float uCursorActive;

void main() {
	vec2 uv = vUv;
	
	// Screen curvature distortion
	vec2 center = uv - 0.5;
	float curvature = ${CURVATURE_STRENGTH};
	float dist = dot(center, center);
	uv = uv + center * dist * curvature;
	
	// Chromatic aberration
	float chromatic = ${CHROMATIC_STRENGTH};
	// Increase near cursor
	float cursorDist = length(uv - uCursor);
	chromatic += smoothstep(0.2, 0.0, cursorDist) * 0.004 * uCursorActive;
	
	vec2 dir = normalize(center + 0.001);
	vec3 color;
	color.r = texture(uScene, uv + dir * chromatic).r;
	color.g = texture(uScene, uv).g;
	color.b = texture(uScene, uv - dir * chromatic).b;
	
	// Add particles
	vec4 particles = texture(uParticles, vUv);
	color += particles.rgb * particles.a;
	
	// Bloom around cursor
	float bloom = smoothstep(0.15, 0.0, cursorDist) * ${BLOOM_INTENSITY} * uCursorActive;
	color += vec3(0.4, 0.7, 1.0) * bloom;
	
	// Soft bloom pass (simple box blur on bright areas)
	vec3 bloomColor = vec3(0.0);
	vec2 texel = 1.0 / uResolution;
	for (float x = -2.0; x <= 2.0; x += 1.0) {
		for (float y = -2.0; y <= 2.0; y += 1.0) {
			vec3 s = texture(uScene, uv + vec2(x, y) * texel * 4.0).rgb;
			float brightness = max(s.r, max(s.g, s.b));
			bloomColor += s * smoothstep(0.8, 1.2, brightness);
		}
	}
	bloomColor /= 25.0;
	color += bloomColor * 0.4;
	
	// CRT scanlines
	float scanline = sin(vUv.y * uResolution.y * 1.5) * 0.5 + 0.5;
	scanline = pow(scanline, 1.5);
	color *= 1.0 - scanline * ${SCANLINE_INTENSITY};
	
	// Subtle horizontal line flicker
	float flicker = sin(uTime * 60.0 + vUv.y * 100.0) * 0.5 + 0.5;
	color *= 1.0 - flicker * 0.01;
	
	// Vignette
	float vignette = 1.0 - dist * 0.8;
	color *= vignette;
	
	// Slight color grade - push towards cyber aesthetic
	color = pow(color, vec3(0.95));
	color.b *= 1.05;
	
	fragColor = vec4(color, 1.0);
}`;

// Particle trail shader
const PARTICLE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevious;
uniform vec2 uParticles[${PARTICLE_COUNT}];
uniform float uParticleAlphas[${PARTICLE_COUNT}];
uniform float uFade;

void main() {
	vec2 uv = vUv;
	
	// Fade previous frame
	vec4 prev = texture(uPrevious, uv) * uFade;
	
	// Add new particles
	float particle = 0.0;
	for (int i = 0; i < ${PARTICLE_COUNT}; i++) {
		float d = length(uv - uParticles[i]);
		particle += smoothstep(0.015, 0.0, d) * uParticleAlphas[i];
	}
	
	vec3 color = prev.rgb + vec3(0.6, 0.85, 1.0) * particle * 0.5;
	float alpha = prev.a + particle * 0.3;
	
	fragColor = vec4(color, min(alpha, 1.0));
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
}

interface DoubleFBO {
	read: FBO;
	write: FBO;
	swap(): void;
}

interface Particle {
	x: number;
	y: number;
	alpha: number;
	life: number;
}

// ---- WebGL Helpers ----

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
	
	return { texture, fbo, width: w, height: h };
}

function createDoubleFBO(gl: WebGL2RenderingContext, w: number, h: number): DoubleFBO {
	let fbo1 = createFBO(gl, w, h);
	let fbo2 = createFBO(gl, w, h);
	return {
		get read() { return fbo1; },
		get write() { return fbo2; },
		swap() { const tmp = fbo1; fbo1 = fbo2; fbo2 = tmp; },
	};
}

// ---- Auto Cursor Path ----

class AutoCursor {
	private points: { x: number; y: number; time: number }[] = [];
	private currentIndex = 0;
	private progress = 0;
	x = 0.5;
	y = 0.5;
	
	constructor() {
		this.generatePath();
	}
	
	private generatePath() {
		// Create organic bezier-like waypoints across the scene
		const numPoints = 8;
		this.points = [];
		
		for (let i = 0; i < numPoints; i++) {
			const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5;
			const radius = 0.15 + Math.random() * 0.25;
			this.points.push({
				x: 0.5 + Math.cos(angle) * radius,
				y: 0.5 + Math.sin(angle) * radius,
				time: 1.5 + Math.random() * 1.0, // Time to reach this point
			});
		}
		// Close the loop
		this.points.push({ ...this.points[0] });
	}
	
	update(dt: number) {
		if (this.points.length < 2) return;
		
		const current = this.points[this.currentIndex];
		const next = this.points[(this.currentIndex + 1) % this.points.length];
		
		this.progress += dt / next.time;
		
		if (this.progress >= 1) {
			this.progress = 0;
			this.currentIndex = (this.currentIndex + 1) % this.points.length;
			if (this.currentIndex === 0) {
				this.generatePath(); // New path each loop
			}
		}
		
		// Smooth easing
		const t = this.easeInOut(this.progress);
		this.x = this.lerp(current.x, next.x, t);
		this.y = this.lerp(current.y, next.y, t);
	}
	
	private lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}
	
	private easeInOut(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}
}

// ---- Main Animation Class ----

export class CyberHeroAnimation {
	readonly supported: boolean;
	
	private canvas: HTMLCanvasElement;
	private gl: WebGL2RenderingContext | null = null;
	
	private programs!: {
		fluid: Program;
		glass: Program;
		post: Program;
		particle: Program;
	};
	
	private fluidFBO!: FBO;
	private sceneFBO!: FBO;
	private particleFBO!: DoubleFBO;
	
	private quadVAO!: WebGLVertexArrayObject;
	private running = false;
	private rafId = 0;
	private startTime = 0;
	private lastTime = 0;
	private resizeObserver: ResizeObserver | null = null;
	
	private autoCursor: AutoCursor;
	private particles: Particle[] = [];
	private lastParticleSpawn = 0;
	
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.autoCursor = new AutoCursor();
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
		
		// Test FBO support
		const testTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, testTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
		const testFb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, testFb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, testTex, 0);
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		gl.deleteFramebuffer(testFb);
		gl.deleteTexture(testTex);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (status !== gl.FRAMEBUFFER_COMPLETE) return false;
		
		try {
			this.compilePrograms();
		} catch (e) {
			console.error('CyberHero shader compilation failed:', e);
			return false;
		}
		
		this.createQuad();
		this.resize();
		
		// Initialize particles
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			this.particles.push({ x: -1, y: -1, alpha: 0, life: 0 });
		}
		
		return true;
	}
	
	private compilePrograms() {
		const gl = this.gl!;
		this.programs = {
			fluid: createProgram(gl, VERT, FLUID_FRAG),
			glass: createProgram(gl, VERT, GLASS_FRAG),
			post: createProgram(gl, VERT, POST_FRAG),
			particle: createProgram(gl, VERT, PARTICLE_FRAG),
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
		const w = this.canvas.width;
		const h = this.canvas.height;
		
		this.fluidFBO = createFBO(gl, w, h);
		this.sceneFBO = createFBO(gl, w, h);
		this.particleFBO = createDoubleFBO(gl, w, h);
	}
	
	start() {
		if (this.running || !this.supported) return;
		this.running = true;
		this.startTime = performance.now();
		this.lastTime = this.startTime;
		
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
		if (this.gl) {
			const loseCtx = this.gl.getExtension('WEBGL_lose_context');
			loseCtx?.loseContext();
		}
		this.gl = null;
	}
	
	private update() {
		if (!this.running) return;
		
		const now = performance.now();
		const dt = Math.min((now - this.lastTime) / 1000, 0.033);
		this.lastTime = now;
		
		const elapsed = (now - this.startTime) / 1000;
		const loopTime = (elapsed % LOOP_DURATION) / LOOP_DURATION * Math.PI * 2;
		
		this.resize();
		
		// Update auto cursor
		this.autoCursor.update(dt);
		
		// Spawn particles along cursor trail
		if (now - this.lastParticleSpawn > 50) {
			this.lastParticleSpawn = now;
			this.spawnParticle(this.autoCursor.x, this.autoCursor.y);
		}
		
		// Update particles
		this.updateParticles(dt);
		
		this.render(elapsed, loopTime);
		
		this.rafId = requestAnimationFrame(() => this.update());
	}
	
	private spawnParticle(x: number, y: number) {
		// Find dead particle to reuse
		for (const p of this.particles) {
			if (p.life <= 0) {
				p.x = x + (Math.random() - 0.5) * 0.02;
				p.y = y + (Math.random() - 0.5) * 0.02;
				p.alpha = 0.8 + Math.random() * 0.2;
				p.life = 1.0;
				break;
			}
		}
	}
	
	private updateParticles(dt: number) {
		for (const p of this.particles) {
			if (p.life > 0) {
				p.life -= dt * 1.5;
				p.alpha *= PARTICLE_FADE;
				// Slight drift
				p.y += dt * 0.02;
			}
		}
	}
	
	private render(time: number, loopTime: number) {
		const gl = this.gl!;
		gl.bindVertexArray(this.quadVAO);
		
		const w = this.canvas.width;
		const h = this.canvas.height;
		
		// 1. Render fluid base
		gl.useProgram(this.programs.fluid.program);
		gl.uniform1f(this.programs.fluid.uniforms['uTime']!, time);
		gl.uniform1f(this.programs.fluid.uniforms['uLoopTime']!, loopTime);
		gl.uniform2f(this.programs.fluid.uniforms['uResolution']!, w, h);
		this.blit(this.fluidFBO);
		
		// 2. Render glass layer on top
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		gl.useProgram(this.programs.glass.program);
		gl.uniform1f(this.programs.glass.uniforms['uTime']!, time);
		gl.uniform1f(this.programs.glass.uniforms['uLoopTime']!, loopTime);
		gl.uniform2f(this.programs.glass.uniforms['uResolution']!, w, h);
		gl.uniform2f(this.programs.glass.uniforms['uCursor']!, this.autoCursor.x, 1.0 - this.autoCursor.y);
		gl.uniform1f(this.programs.glass.uniforms['uCursorActive']!, 1.0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.fluidFBO.texture);
		gl.uniform1i(this.programs.glass.uniforms['uFluid']!, 0);
		this.blit(this.sceneFBO);
		
		gl.disable(gl.BLEND);
		
		// 3. Render particles
		gl.useProgram(this.programs.particle.program);
		gl.uniform1f(this.programs.particle.uniforms['uFade']!, PARTICLE_FADE);
		
		const particlePositions: number[] = [];
		const particleAlphas: number[] = [];
		for (const p of this.particles) {
			particlePositions.push(p.x, 1.0 - p.y);
			particleAlphas.push(p.life > 0 ? p.alpha : 0);
		}
		
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const loc = this.programs.particle.uniforms[`uParticles[${i}]`];
			if (loc) gl.uniform2f(loc, particlePositions[i * 2], particlePositions[i * 2 + 1]);
			const alphaLoc = this.programs.particle.uniforms[`uParticleAlphas[${i}]`];
			if (alphaLoc) gl.uniform1f(alphaLoc, particleAlphas[i]);
		}
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.particleFBO.read.texture);
		gl.uniform1i(this.programs.particle.uniforms['uPrevious']!, 0);
		this.blit(this.particleFBO.write);
		this.particleFBO.swap();
		
		// 4. Post-processing to screen
		gl.useProgram(this.programs.post.program);
		gl.uniform1f(this.programs.post.uniforms['uTime']!, time);
		gl.uniform2f(this.programs.post.uniforms['uResolution']!, w, h);
		gl.uniform2f(this.programs.post.uniforms['uCursor']!, this.autoCursor.x, 1.0 - this.autoCursor.y);
		gl.uniform1f(this.programs.post.uniforms['uCursorActive']!, 1.0);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
		gl.uniform1i(this.programs.post.uniforms['uScene']!, 0);
		
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.particleFBO.read.texture);
		gl.uniform1i(this.programs.post.uniforms['uParticles']!, 1);
		
		this.blit(null);
		
		gl.bindVertexArray(null);
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
