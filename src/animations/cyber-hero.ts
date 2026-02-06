/**
 * cyber-hero.ts
 * Cinematic experimental-web hero animation engine.
 *
 * Dual-layer cursor: ambient "ghost" + real mouse gravity well.
 * Velocity-reactive chromatic aberration, electric plasma arcs,
 * volumetric light leaks through frosted glass, click shockwaves,
 * viscous fluid dynamics with heavy, physical motion.
 * WebGL 2 required.
 */

// ---- Configuration ----

const LOOP_DURATION = 13.5;
const RIPPLE_RADIUS = 0.28;
const RIPPLE_STRENGTH = 1.0;
const DEFROST_RADIUS = 0.22;
const BLOOM_INTENSITY = 0.65;
const SCANLINE_INTENSITY = 0.035;
const CHROMATIC_BASE = 0.005;
const CHROMATIC_VELOCITY = 0.02;
const CURVATURE_STRENGTH = 0.025;
const FROST_AMOUNT = 0.5;
const PARTICLE_COUNT = 64;
const PARTICLE_FADE = 0.94;
const WARP_STRENGTH = 0.12;
const GRAVITY_MUL = 3.0;
const LIGHT_RAY_INTENSITY = 0.45;
const ELECTRIC_ARC_COUNT = 12;
const VELOCITY_COLOR_SHIFT = 2.5;
const SHOCKWAVE_DECAY = 3.0;
const CURSOR_SMOOTH = 8.0;
const CURSOR_ACTIVATE = 5.0;
const CURSOR_DEACTIVATE = 1.5;
const VELOCITY_SMOOTH_FACTOR = 0.15;
const ARC_SPAWN_DIST = 0.22;
const ARC_SPAWN_CHANCE = 0.035;
const ARC_LIFE = 0.3;

// ---- Shader Sources ----

const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Turbulent viscous fluid with gravity well + click repulsion
const FLUID_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uLoopTime;
uniform vec2 uResolution;
uniform vec2 uCursor;
uniform float uCursorVelocity;
uniform float uClickIntensity;
uniform float uGravityMul;
uniform vec2 uClickPos;

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
	f += 0.0625 * snoise(p); p *= 2.01;
	f += 0.0312 * snoise(p);
	return f;
}

float turbulence(vec3 p) {
	float f = 0.0;
	f += abs(snoise(p)) * 0.5; p *= 2.03;
	f += abs(snoise(p)) * 0.25; p *= 2.01;
	f += abs(snoise(p)) * 0.125; p *= 2.02;
	f += abs(snoise(p)) * 0.0625;
	return f;
}

void main() {
	vec2 uv = vUv;
	float t = uLoopTime;

	// Gravity well — amplified when real mouse active
	vec2 toCursor = uCursor - uv;
	float cursorDist = length(toCursor);
	float warpBase = ${WARP_STRENGTH} / (cursorDist + 0.08);
	warpBase = min(warpBase, 0.4);
	float warpAmount = warpBase * (1.0 + uGravityMul * 2.0);
	vec2 cursorDir = normalize(toCursor + 0.001);
	uv += cursorDir * warpAmount * 0.15;

	// Click shockwave: repel fluid outward
	vec2 fromClick = uv - uClickPos;
	float clickDist = length(fromClick);
	float repulse = uClickIntensity * smoothstep(0.5, 0.0, clickDist) * 0.12;
	repulse *= (1.0 + sin(clickDist * 40.0 - uClickIntensity * 30.0) * 0.4);
	uv += normalize(fromClick + 0.001) * repulse;

	vec2 center = vec2(0.5);
	vec2 offset = uv - center;

	// Viscous swirl — slower rotation for heavier feel
	float angle = t * 0.35 + cursorDist * 2.0;
	float s = sin(angle);
	float c = cos(angle);
	vec2 rotated = vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);

	// Noise layers with viscous drag toward cursor
	vec2 drag = cursorDir * warpAmount * 0.2;
	vec3 p1 = vec3(rotated * 2.8 + t * 0.22 + drag, t * 0.12);
	vec3 p2 = vec3(uv * 3.5 - t * 0.12 + drag * 0.5, t * 0.18 + 10.0);
	vec3 p3 = vec3(rotated * 2.2 + t * 0.18, t * 0.1 + 20.0);
	vec3 p4 = vec3(uv * 5.0 + t * 0.25, t * 0.2 + 30.0);

	float n1 = fbm(p1);
	float n2 = fbm(p2);
	float n3 = turbulence(p3);
	float n4 = turbulence(p4);

	// Energy streams
	vec2 streamUv = uv * 7.0 + vec2(t * 0.4, t * 0.25);
	float streams = sin(streamUv.x + snoise(vec3(uv * 2.5, t * 0.35)) * 3.0) * 0.5 + 0.5;
	streams *= sin(streamUv.y + snoise(vec3(uv * 3.5 + 50.0, t * 0.25)) * 2.0) * 0.5 + 0.5;
	streams = pow(streams, 3.0);

	// Palette
	vec3 cyan = vec3(0.0, 0.9, 1.0);
	vec3 magenta = vec3(1.0, 0.05, 0.6);
	vec3 indigo = vec3(0.2, 0.05, 0.9);
	vec3 purple = vec3(0.6, 0.1, 1.0);
	vec3 hotWhite = vec3(0.9, 0.95, 1.0);
	vec3 hotPink = vec3(1.0, 0.3, 0.5);

	// Velocity color temperature
	float velocityHeat = uCursorVelocity * ${VELOCITY_COLOR_SHIFT};
	cyan = mix(cyan, hotWhite, velocityHeat * 0.5);
	magenta = mix(magenta, hotPink, velocityHeat * 0.7);

	float blend1 = smoothstep(-0.2, 0.6, n1);
	float blend2 = smoothstep(-0.1, 0.7, n2);
	float blend3 = smoothstep(0.0, 0.5, n3);

	vec3 color = mix(indigo, cyan, blend1);
	color = mix(color, magenta, blend2 * 0.8);
	color = mix(color, purple, blend3 * 0.6);

	color += hotWhite * streams * 0.4;

	// Cursor energy glow
	float cursorEnergy = smoothstep(0.4, 0.0, cursorDist);
	color += cyan * cursorEnergy * 0.5 * (1.0 + sin(t * 8.0) * 0.3);

	// Click explosion burst
	float explosion = uClickIntensity * smoothstep(0.5, 0.0, clickDist);
	explosion *= (1.0 + sin(clickDist * 30.0 - uClickIntensity * 40.0) * 0.5);
	color += hotWhite * explosion * 2.5;
	color += hotPink * explosion * sin(clickDist * 20.0) * 1.5;

	// Pulsing energy cores
	float pulse = sin(t * 2.0) * 0.5 + 0.5;
	float energyCores = pow(max(0.0, n1 + n2 * 0.6 + n4 * 0.3), 4.0) * 3.0;
	color += vec3(0.4, 0.7, 1.0) * energyCores * (0.8 + pulse * 0.4);

	// Hot spots
	float hotSpots = pow(max(0.0, n3 * n4), 2.0) * 4.0;
	color += magenta * hotSpots * 0.6;

	// Vignette
	float vignette = 1.0 - length(offset) * 0.4;
	color *= vignette;

	// Breathing intensity
	float intensity = 0.7 + 0.3 * sin(t * 0.4);
	color *= intensity;

	fragColor = vec4(color, 1.0);
}`;

// Glassmorphism with dual cursor defrost, light leaks, magnetic attraction
const GLASS_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uFluid;
uniform float uTime;
uniform float uLoopTime;
uniform vec2 uResolution;
uniform vec2 uCursor;
uniform vec2 uRealCursor;
uniform float uCursorActive;
uniform float uRealActive;
uniform float uCursorVelocity;
uniform float uClickIntensity;

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

	// Gravity distortion toward smooth cursor
	vec2 toCursor = uCursor - uv;
	float cursorDist = length(toCursor);
	float gravityPull = ${WARP_STRENGTH} / (cursorDist + 0.15);
	gravityPull = min(gravityPull, 0.2);
	vec2 warpedUv = uv + normalize(toCursor + 0.001) * gravityPull * 0.08;

	// LAYER 1: Back glass panel
	vec2 p1Center = vec2(0.35 + sin(t * 0.15) * 0.12, 0.55 + cos(t * 0.12) * 0.1);
	p1Center += normalize(toCursor + 0.001) * gravityPull * 0.03;
	float d1 = length(uv - p1Center);
	float panel1 = smoothstep(0.4, 0.2, d1);

	// LAYER 2: Mid glass panel
	vec2 p2Center = vec2(0.65 + cos(t * 0.2) * 0.1, 0.45 + sin(t * 0.18) * 0.1);
	p2Center += normalize(toCursor + 0.001) * gravityPull * 0.05;
	float d2 = length(uv - p2Center);
	float panel2 = smoothstep(0.3, 0.12, d2);

	// LAYER 3: Front glass orb
	vec2 p3Center = vec2(0.5 + sin(t * 0.25) * 0.08, 0.35 + cos(t * 0.22) * 0.08);
	p3Center += normalize(toCursor + 0.001) * gravityPull * 0.08;
	vec2 p3Offset = uv - p3Center;
	float d3 = length(p3Offset * vec2(1.3, 1.0));
	float panel3 = smoothstep(0.25, 0.1, d3);

	// LAYER 4: Floating orbs
	float orbs = 0.0;
	for (float i = 0.0; i < 5.0; i++) {
		vec2 orbPos = vec2(
			0.2 + i * 0.15 + sin(t * (0.3 + i * 0.1) + i) * 0.1,
			0.3 + cos(t * (0.25 + i * 0.08) + i * 2.0) * 0.2
		);
		orbPos += normalize(toCursor + 0.001) * gravityPull * 0.1;
		float orbD = length(uv - orbPos);
		orbs += smoothstep(0.08, 0.02, orbD) * 0.4;
	}

	float glass = max(max(max(panel1, panel2), panel3), orbs);

	// Frost with dual-cursor defrost
	vec2 texelSize = 1.0 / uResolution;
	float frostAmount = ${FROST_AMOUNT};

	// Smooth cursor defrost (ghost or blended)
	float defrost = smoothstep(${DEFROST_RADIUS} * 1.2, 0.0, cursorDist) * uCursorActive;

	// Real cursor: tighter, more responsive defrost lens
	float realDist = length(uRealCursor - uv);
	float realDefrost = smoothstep(${DEFROST_RADIUS} * 0.8, 0.0, realDist) * uRealActive;
	defrost = max(defrost, realDefrost);

	// Velocity widens the defrost trail
	float minDist = min(cursorDist, realDist);
	defrost += uCursorVelocity * 0.6 * smoothstep(0.35, 0.0, minDist);
	defrost = min(defrost, 1.0);
	frostAmount *= (1.0 - defrost * 0.95);

	// Multi-sample frost blur
	vec3 blurred = vec3(0.0);
	float samples = 0.0;
	for (float x = -3.0; x <= 3.0; x += 1.0) {
		for (float y = -3.0; y <= 3.0; y += 1.0) {
			vec2 blurOffset = vec2(x, y) * texelSize * 10.0 * frostAmount * glass;
			blurOffset += vec2(noise(uv * 25.0 + t), noise(uv * 25.0 + 100.0 + t)) * texelSize * 6.0 * glass;
			blurred += texture(uFluid, warpedUv + blurOffset).rgb;
			samples += 1.0;
		}
	}
	blurred /= samples;

	vec3 sharp = texture(uFluid, warpedUv).rgb;
	vec3 fluid = mix(blurred, sharp, defrost);

	// Volumetric light leaks — bright fluid bleeding through glass
	vec3 leakColor = vec3(0.0);
	float leakWeight = 0.0;
	for (float i = 0.0; i < 4.0; i++) {
		float angle = i * 1.5708 + t * 0.12;
		vec2 sDir = vec2(cos(angle), sin(angle));
		vec3 s = texture(uFluid, warpedUv + sDir * 0.07).rgb;
		float brightness = dot(s, vec3(0.299, 0.587, 0.114));
		float w = brightness * brightness;
		leakColor += s * w;
		leakWeight += w;
	}
	if (leakWeight > 0.01) {
		leakColor = leakColor / leakWeight * 0.2;
	} else {
		leakColor = vec3(0.0);
	}

	// Edge highlights
	float edge1 = (smoothstep(0.35, 0.32, d1) - smoothstep(0.32, 0.29, d1)) * 0.4;
	float edge2 = (smoothstep(0.26, 0.23, d2) - smoothstep(0.23, 0.2, d2)) * 0.6;
	float edge3 = (smoothstep(0.22, 0.19, d3) - smoothstep(0.19, 0.16, d3)) * 0.8;
	float edges = edge1 + edge2 + edge3;

	// Inner glow
	float innerGlow = panel1 * 0.1 + panel2 * 0.15 + panel3 * 0.2;

	// Specular highlights
	float spec = pow(max(0.0, 1.0 - d1 * 2.5), 10.0) * 0.25;
	spec += pow(max(0.0, 1.0 - d2 * 3.5), 8.0) * 0.35;
	spec += pow(max(0.0, 1.0 - d3 * 4.5), 6.0) * 0.5;

	// Volumetric light rays from cursor
	float rays = 0.0;
	vec2 rayDir = normalize(uv - uCursor + 0.001);
	for (float i = 0.0; i < 12.0; i++) {
		float rayAngle = atan(rayDir.y, rayDir.x) + i * 0.523;
		float ray = pow(max(0.0, cos(rayAngle * 6.0 + t * 2.0)), 8.0);
		ray *= smoothstep(0.5, 0.0, cursorDist);
		rays += ray * 0.08;
	}
	rays *= uCursorActive * ${LIGHT_RAY_INTENSITY};

	// Ripple waves
	float ripple = sin(cursorDist * 50.0 - t * 12.0) * 0.5 + 0.5;
	ripple *= smoothstep(${RIPPLE_RADIUS}, 0.0, cursorDist) * uCursorActive * ${RIPPLE_STRENGTH};
	ripple *= 1.0 + uCursorVelocity * 2.0;

	// Click shockwave ring
	float shockwave = sin(cursorDist * 40.0 - uClickIntensity * 50.0) * 0.5 + 0.5;
	shockwave *= smoothstep(0.6, 0.0, cursorDist) * uClickIntensity;

	// Compose
	vec3 color = fluid;
	color += leakColor * glass;
	color += vec3(0.7, 0.9, 1.0) * edges;
	color += vec3(0.5, 0.7, 1.0) * innerGlow;
	color += vec3(1.0, 0.98, 0.95) * spec;
	color += vec3(0.6, 0.85, 1.0) * ripple * glass;
	color += vec3(0.4, 0.8, 1.0) * rays;
	color += vec3(1.0, 0.9, 0.95) * shockwave;

	float refract = glass * 0.35;

	fragColor = vec4(color, glass * 0.45 + refract + rays * 0.2);
}`;

// Post-processing: velocity-directional CA, click jitter, god rays, bloom
const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform sampler2D uParticles;
uniform sampler2D uElectricArcs;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uCursor;
uniform float uCursorActive;
uniform float uCursorVelocity;
uniform float uClickIntensity;
uniform vec2 uVelocityDir;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
	vec2 uv = vUv;
	vec2 center = uv - 0.5;
	float dist = dot(center, center);

	// CRT curvature
	float curvature = ${CURVATURE_STRENGTH} * (1.0 + uCursorVelocity * 0.5);
	uv = uv + center * dist * curvature;

	// Click-triggered horizontal jitter (CRT glitch)
	float jitter = uClickIntensity * sin(uTime * 200.0 + vUv.y * 300.0) * 0.004;
	uv.x += jitter;

	// Cursor gravity distortion
	float cursorDist = length(uv - uCursor);
	vec2 toCursor = normalize(uCursor - uv + 0.001);
	float warp = ${WARP_STRENGTH} / (cursorDist + 0.2) * uCursorActive;
	warp = min(warp, 0.15);
	uv += toCursor * warp * 0.05;

	// Chromatic aberration: radial + velocity-directional + click burst
	float radialCA = ${CHROMATIC_BASE} + dist * 0.003;
	radialCA += smoothstep(0.25, 0.0, cursorDist) * 0.01 * uCursorActive;
	float clickCA = uClickIntensity * 0.015;

	vec2 radialDir = normalize(center + 0.001);
	vec2 caRadial = radialDir * (radialCA + clickCA);

	// Velocity-directional split: fast mouse shatters RGB along motion vector
	vec2 velCA = uVelocityDir * uCursorVelocity * ${CHROMATIC_VELOCITY};

	vec3 color;
	color.r = texture(uScene, uv + caRadial * 1.2 + velCA * 0.8).r;
	color.g = texture(uScene, uv).g;
	color.b = texture(uScene, uv - caRadial * 1.2 - velCA * 0.8).b;

	// Particles overlay
	vec4 particles = texture(uParticles, vUv);
	color += particles.rgb * particles.a * 1.5;

	// Electric arcs overlay
	vec4 arcs = texture(uElectricArcs, vUv);
	color += arcs.rgb * arcs.a * 2.0;

	// Cursor bloom
	float cursorBloom = smoothstep(0.2, 0.0, cursorDist) * ${BLOOM_INTENSITY} * uCursorActive;
	cursorBloom *= 1.0 + uCursorVelocity * 1.5;
	color += vec3(0.5, 0.8, 1.0) * cursorBloom;

	// Click flash
	float flash = uClickIntensity * smoothstep(0.4, 0.0, cursorDist);
	color += vec3(1.0, 0.95, 0.9) * flash * 3.0;

	// Wide bloom pass
	vec3 bloomColor = vec3(0.0);
	vec2 texel = 1.0 / uResolution;
	for (float x = -3.0; x <= 3.0; x += 1.0) {
		for (float y = -3.0; y <= 3.0; y += 1.0) {
			vec3 s = texture(uScene, uv + vec2(x, y) * texel * 6.0).rgb;
			float brightness = max(s.r, max(s.g, s.b));
			bloomColor += s * smoothstep(0.6, 1.0, brightness);
		}
	}
	bloomColor /= 49.0;
	color += bloomColor * 0.6;

	// Tight bloom
	vec3 tightBloom = vec3(0.0);
	for (float x = -2.0; x <= 2.0; x += 1.0) {
		for (float y = -2.0; y <= 2.0; y += 1.0) {
			vec3 s = texture(uScene, uv + vec2(x, y) * texel * 2.0).rgb;
			float brightness = max(s.r, max(s.g, s.b));
			tightBloom += s * smoothstep(0.9, 1.5, brightness);
		}
	}
	tightBloom /= 25.0;
	color += tightBloom * 0.8;

	// God rays from bright scene areas toward cursor
	vec3 godRays = vec3(0.0);
	for (float i = 0.0; i < 16.0; i++) {
		float rayT = i / 16.0;
		vec2 rayPos = mix(uv, uCursor, rayT * 0.4);
		vec3 raySample = texture(uScene, rayPos).rgb;
		float rayBright = max(raySample.r, max(raySample.g, raySample.b));
		godRays += raySample * rayBright * (1.0 - rayT);
	}
	godRays /= 16.0;
	color += godRays * 0.25 * uCursorActive;

	// CRT scanlines — boosted on click
	float scanlineBoost = 1.0 + uClickIntensity * 4.0;
	float scanline = sin(vUv.y * uResolution.y * 1.8) * 0.5 + 0.5;
	scanline = pow(scanline, 1.8);
	float scanlineIntensity = ${SCANLINE_INTENSITY} * scanlineBoost;
	scanlineIntensity *= (1.0 - smoothstep(0.3, 0.0, cursorDist) * 0.5 * uCursorActive);
	color *= 1.0 - scanline * scanlineIntensity;

	// Screen noise
	float noise = hash(vUv * uResolution + uTime * 100.0) * 2.0 - 1.0;
	float noiseAmount = 0.015 * (1.0 - smoothstep(0.25, 0.0, cursorDist) * 0.8 * uCursorActive);
	noiseAmount += uClickIntensity * 0.02;
	color += noise * noiseAmount;

	// Flicker
	float flicker = sin(uTime * 90.0 + vUv.y * 150.0) * 0.5 + 0.5;
	color *= 1.0 - flicker * 0.015;

	// Vignette
	float vignette = 1.0 - dist * 1.0;
	vignette = pow(vignette, 0.8);
	color *= vignette;

	// Color grading
	color = pow(color, vec3(0.92));
	color.b *= 1.08;
	color.r *= 1.02;

	// Saturation boost
	float luma = dot(color, vec3(0.299, 0.587, 0.114));
	color = mix(vec3(luma), color, 1.15);

	fragColor = vec4(color, 1.0);
}`;

// Particle system with multiple visual types
const PARTICLE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevious;
uniform vec2 uParticles[${PARTICLE_COUNT}];
uniform float uParticleAlphas[${PARTICLE_COUNT}];
uniform float uParticleTypes[${PARTICLE_COUNT}];
uniform float uFade;

void main() {
	vec2 uv = vUv;
	vec4 prev = texture(uPrevious, uv) * uFade;

	vec3 particleColor = vec3(0.0);
	float particleAlpha = 0.0;

	for (int i = 0; i < ${PARTICLE_COUNT}; i++) {
		float d = length(uv - uParticles[i]);
		float type = uParticleTypes[i];

		if (type < 0.33) {
			float spark = smoothstep(0.02, 0.0, d) * uParticleAlphas[i];
			particleColor += vec3(0.4, 0.9, 1.0) * spark;
			particleAlpha += spark * 0.5;
		} else if (type < 0.66) {
			float orb = smoothstep(0.025, 0.0, d) * uParticleAlphas[i];
			float glow = smoothstep(0.06, 0.0, d) * uParticleAlphas[i] * 0.3;
			particleColor += vec3(1.0, 0.3, 0.7) * orb + vec3(1.0, 0.5, 0.8) * glow;
			particleAlpha += orb * 0.6 + glow * 0.2;
		} else {
			float core = smoothstep(0.015, 0.0, d) * uParticleAlphas[i];
			float halo = smoothstep(0.04, 0.0, d) * uParticleAlphas[i] * 0.4;
			particleColor += vec3(1.0, 0.98, 0.95) * core + vec3(0.6, 0.8, 1.0) * halo;
			particleAlpha += core * 0.8 + halo * 0.3;
		}
	}

	vec3 color = prev.rgb + particleColor;
	float alpha = prev.a + particleAlpha;
	fragColor = vec4(color, min(alpha, 1.0));
}`;

// Electric plasma arcs with jagged lightning
const ELECTRIC_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevious;
uniform vec2 uArcStarts[${ELECTRIC_ARC_COUNT}];
uniform vec2 uArcEnds[${ELECTRIC_ARC_COUNT}];
uniform float uArcAlphas[${ELECTRIC_ARC_COUNT}];
uniform float uTime;
uniform float uFade;

float hash(float n) { return fract(sin(n) * 43758.5453); }

float sdSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}

void main() {
	vec2 uv = vUv;
	vec4 prev = texture(uPrevious, uv) * uFade;

	vec3 arcColor = vec3(0.0);
	float arcAlpha = 0.0;

	for (int i = 0; i < ${ELECTRIC_ARC_COUNT}; i++) {
		if (uArcAlphas[i] < 0.01) continue;

		vec2 start = uArcStarts[i];
		vec2 end = uArcEnds[i];

		// Jagged multi-segment lightning path
		vec2 mid1 = mix(start, end, 0.33);
		vec2 mid2 = mix(start, end, 0.66);

		float jitter1 = hash(float(i) + uTime * 50.0) * 0.06 - 0.03;
		float jitter2 = hash(float(i) + 100.0 + uTime * 50.0) * 0.06 - 0.03;
		mid1 += vec2(jitter1, jitter2);
		mid2 += vec2(-jitter2, jitter1);

		float d = min(
			min(sdSegment(uv, start, mid1), sdSegment(uv, mid1, mid2)),
			sdSegment(uv, mid2, end)
		);

		// Hot white core
		float arc = smoothstep(0.008, 0.0, d) * uArcAlphas[i];
		// Cyan glow halo
		float glow = smoothstep(0.04, 0.0, d) * uArcAlphas[i] * 0.4;

		arcColor += vec3(0.7, 0.9, 1.0) * arc + vec3(0.4, 0.6, 1.0) * glow;
		arcAlpha += arc * 0.9 + glow * 0.3;
	}

	fragColor = vec4(prev.rgb + arcColor, min(prev.a + arcAlpha, 1.0));
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
	vx: number;
	vy: number;
	alpha: number;
	life: number;
	type: number;
}

interface Arc {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	alpha: number;
	life: number;
	maxLife: number;
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
		if (!info) continue;
		if (info.size > 1) {
			// Array uniform: cache each element location
			const baseName = info.name.replace('[0]', '');
			for (let j = 0; j < info.size; j++) {
				const name = `${baseName}[${j}]`;
				uniforms[name] = gl.getUniformLocation(program, name);
			}
		} else {
			uniforms[info.name] = gl.getUniformLocation(program, info.name);
		}
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

// ---- Auto Cursor (Ghost) ----

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
		const numPoints = 8;
		this.points = [];
		for (let i = 0; i < numPoints; i++) {
			const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5;
			const radius = 0.15 + Math.random() * 0.25;
			this.points.push({
				x: 0.5 + Math.cos(angle) * radius,
				y: 0.5 + Math.sin(angle) * radius,
				time: 1.5 + Math.random() * 1.0,
			});
		}
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
			if (this.currentIndex === 0) this.generatePath();
		}
		const t = this.easeInOut(this.progress);
		this.x = current.x + (next.x - current.x) * t;
		this.y = current.y + (next.y - current.y) * t;
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
		electric: Program;
	};

	private fluidFBO!: FBO;
	private sceneFBO!: FBO;
	private particleFBO!: DoubleFBO;
	private electricFBO!: DoubleFBO;

	private quadVAO!: WebGLVertexArrayObject;
	private running = false;
	private rafId = 0;
	private startTime = 0;
	private lastTime = 0;
	private resizeObserver: ResizeObserver | null = null;

	// Dual cursor system
	private ghostCursor: AutoCursor;
	private mousePresent = false;
	private realCursorX = 0.5;
	private realCursorY = 0.5;
	private prevRealCursorX = 0.5;
	private prevRealCursorY = 0.5;
	private smoothCursorX = 0.5;
	private smoothCursorY = 0.5;
	private realActive = 0; // 0–1 blend factor

	// Velocity
	private cursorVelocity = 0;
	private velocityDirX = 0;
	private velocityDirY = 0;

	// Click shockwave
	private clickIntensity = 0;
	private clickX = 0.5;
	private clickY = 0.5;

	// Particles & arcs
	private particles: Particle[] = [];
	private arcs: Arc[] = [];
	private orbPositions: { x: number; y: number }[] = [];
	private lastParticleSpawn = 0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ghostCursor = new AutoCursor();
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
			this.particles.push({ x: -1, y: -1, vx: 0, vy: 0, alpha: 0, life: 0, type: Math.random() });
		}

		// Initialize arcs
		for (let i = 0; i < ELECTRIC_ARC_COUNT; i++) {
			this.arcs.push({ startX: 0, startY: 0, endX: 0, endY: 0, alpha: 0, life: 0, maxLife: 0 });
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
			electric: createProgram(gl, VERT, ELECTRIC_FRAG),
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
		this.electricFBO = createDoubleFBO(gl, w, h);
	}

	// ---- Event Listeners ----

	private setupEventListeners() {
		this.canvas.addEventListener('mousemove', this.onMouseMove);
		this.canvas.addEventListener('mouseenter', this.onMouseEnter);
		this.canvas.addEventListener('mouseleave', this.onMouseLeave);
		this.canvas.addEventListener('click', this.onClick);
		this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
		this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: true });
		this.canvas.addEventListener('touchend', this.onTouchEnd);
	}

	private removeEventListeners() {
		this.canvas.removeEventListener('mousemove', this.onMouseMove);
		this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
		this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
		this.canvas.removeEventListener('click', this.onClick);
		this.canvas.removeEventListener('touchstart', this.onTouchStart);
		this.canvas.removeEventListener('touchmove', this.onTouchMove);
		this.canvas.removeEventListener('touchend', this.onTouchEnd);
	}

	private updateCursorFromClient(clientX: number, clientY: number) {
		const rect = this.canvas.getBoundingClientRect();
		this.realCursorX = (clientX - rect.left) / rect.width;
		this.realCursorY = (clientY - rect.top) / rect.height;
	}

	private onMouseMove = (e: MouseEvent) => {
		this.updateCursorFromClient(e.clientX, e.clientY);
	};

	private onMouseEnter = (e: MouseEvent) => {
		this.mousePresent = true;
		this.updateCursorFromClient(e.clientX, e.clientY);
		// Seed smooth cursor to avoid lerp jump
		this.smoothCursorX = this.realCursorX;
		this.smoothCursorY = this.realCursorY;
		this.prevRealCursorX = this.realCursorX;
		this.prevRealCursorY = this.realCursorY;
	};

	private onMouseLeave = () => {
		this.mousePresent = false;
	};

	private onClick = (e: MouseEvent) => {
		this.updateCursorFromClient(e.clientX, e.clientY);
		this.triggerShockwave(this.realCursorX, this.realCursorY);
	};

	private onTouchStart = (e: TouchEvent) => {
		const touch = e.touches[0];
		this.updateCursorFromClient(touch.clientX, touch.clientY);
		this.mousePresent = true;
		this.smoothCursorX = this.realCursorX;
		this.smoothCursorY = this.realCursorY;
		this.prevRealCursorX = this.realCursorX;
		this.prevRealCursorY = this.realCursorY;
		this.triggerShockwave(this.realCursorX, this.realCursorY);
	};

	private onTouchMove = (e: TouchEvent) => {
		const touch = e.touches[0];
		this.updateCursorFromClient(touch.clientX, touch.clientY);
	};

	private onTouchEnd = () => {
		this.mousePresent = false;
	};

	private triggerShockwave(x: number, y: number) {
		this.clickX = x;
		this.clickY = y;
		this.clickIntensity = 1.0;
		// Burst particles from click point
		for (let i = 0; i < 24; i++) {
			this.spawnClickParticle(x, y);
		}
	}

	// ---- Lifecycle ----

	start() {
		if (this.running || !this.supported) return;
		this.running = true;
		this.startTime = performance.now();
		this.lastTime = this.startTime;

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.canvas);
		this.setupEventListeners();
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
		this.removeEventListeners();
	}

	destroy() {
		this.stop();
		if (this.gl) {
			const loseCtx = this.gl.getExtension('WEBGL_lose_context');
			loseCtx?.loseContext();
		}
		this.gl = null;
	}

	// ---- Update Loop ----

	private update() {
		if (!this.running) return;

		const now = performance.now();
		const dt = Math.min((now - this.lastTime) / 1000, 0.033);
		this.lastTime = now;

		const elapsed = (now - this.startTime) / 1000;
		const loopTime = (elapsed % LOOP_DURATION) / LOOP_DURATION * Math.PI * 2;

		this.resize();

		// Update ghost cursor
		this.ghostCursor.update(dt);

		// Smooth real-active blend factor
		const targetActive = this.mousePresent ? 1.0 : 0.0;
		const activeSpeed = this.mousePresent ? CURSOR_ACTIVATE : CURSOR_DEACTIVATE;
		this.realActive += (targetActive - this.realActive) * Math.min(activeSpeed * dt, 1.0);

		// Compute velocity from real cursor movement
		const dx = this.realCursorX - this.prevRealCursorX;
		const dy = this.realCursorY - this.prevRealCursorY;
		const rawVelocity = dt > 0 ? Math.min(Math.sqrt(dx * dx + dy * dy) / dt, 2.0) : 0;
		this.cursorVelocity += (rawVelocity - this.cursorVelocity) * VELOCITY_SMOOTH_FACTOR;

		// Velocity direction (normalized)
		const vmag = Math.sqrt(dx * dx + dy * dy);
		if (vmag > 0.0001) {
			this.velocityDirX = dx / vmag;
			this.velocityDirY = dy / vmag;
		}

		this.prevRealCursorX = this.realCursorX;
		this.prevRealCursorY = this.realCursorY;

		// Smooth effective cursor: blends ghost + real with inertia for "heavy" feel
		const ghostWeight = 1.0 - this.realActive * 0.85;
		const targetX = this.ghostCursor.x * ghostWeight + this.realCursorX * (1.0 - ghostWeight);
		const targetY = this.ghostCursor.y * ghostWeight + this.realCursorY * (1.0 - ghostWeight);
		const smoothSpeed = CURSOR_SMOOTH * (this.mousePresent ? 1.0 : 0.5);
		this.smoothCursorX += (targetX - this.smoothCursorX) * Math.min(smoothSpeed * dt, 1.0);
		this.smoothCursorY += (targetY - this.smoothCursorY) * Math.min(smoothSpeed * dt, 1.0);

		// Decay click intensity
		this.clickIntensity = Math.max(0, this.clickIntensity - SHOCKWAVE_DECAY * dt);

		// Compute orb positions for arc spawning
		this.computeOrbPositions(loopTime);

		// Try spawning electric arcs
		this.trySpawnArcs();

		// Spawn trail particles
		if (now - this.lastParticleSpawn > 50) {
			this.lastParticleSpawn = now;
			this.spawnTrailParticle(this.smoothCursorX, this.smoothCursorY);
		}

		// Update particles and arcs
		this.updateParticles(dt);
		this.updateArcs(dt);

		this.render(elapsed, loopTime);
		this.rafId = requestAnimationFrame(() => this.update());
	}

	// ---- Orb Positions (mirror glass shader logic) ----

	private computeOrbPositions(loopTime: number) {
		const t = loopTime;
		this.orbPositions = [
			{ x: 0.35 + Math.sin(t * 0.15) * 0.12, y: 0.55 + Math.cos(t * 0.12) * 0.1 },
			{ x: 0.65 + Math.cos(t * 0.2) * 0.1, y: 0.45 + Math.sin(t * 0.18) * 0.1 },
			{ x: 0.5 + Math.sin(t * 0.25) * 0.08, y: 0.35 + Math.cos(t * 0.22) * 0.08 },
		];
		for (let i = 0; i < 5; i++) {
			this.orbPositions.push({
				x: 0.2 + i * 0.15 + Math.sin(t * (0.3 + i * 0.1) + i) * 0.1,
				y: 0.3 + Math.cos(t * (0.25 + i * 0.08) + i * 2.0) * 0.2,
			});
		}
	}

	// ---- Electric Arc System ----

	private trySpawnArcs() {
		// Only spawn when cursor is active and moving, or ghost is near orb pairs
		const cx = this.smoothCursorX;
		const cy = 1.0 - this.smoothCursorY; // UV space

		for (let i = 0; i < this.orbPositions.length; i++) {
			for (let j = i + 1; j < this.orbPositions.length; j++) {
				const a = this.orbPositions[i];
				const b = this.orbPositions[j];

				// Skip distant pairs
				const orbDist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
				if (orbDist > 0.45) continue;

				// Distance from cursor to segment between orbs
				const dist = this.pointSegmentDist(cx, cy, a.x, a.y, b.x, b.y);

				if (dist < ARC_SPAWN_DIST && Math.random() < ARC_SPAWN_CHANCE) {
					// Arc in UV space (Y already correct for orbs)
					this.spawnArc(a.x, a.y, b.x, b.y);
				}
			}
		}
	}

	private spawnArc(sx: number, sy: number, ex: number, ey: number) {
		for (const arc of this.arcs) {
			if (arc.life <= 0) {
				arc.startX = sx;
				arc.startY = sy;
				arc.endX = ex;
				arc.endY = ey;
				arc.maxLife = ARC_LIFE + Math.random() * 0.15;
				arc.life = arc.maxLife;
				arc.alpha = 1.0;
				break;
			}
		}
	}

	private updateArcs(dt: number) {
		for (const arc of this.arcs) {
			if (arc.life > 0) {
				arc.life -= dt;
				arc.alpha = Math.max(0, arc.life / arc.maxLife);
			}
		}
	}

	private pointSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
		const segDx = bx - ax, segDy = by - ay;
		const lenSq = segDx * segDx + segDy * segDy;
		if (lenSq < 0.0001) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
		const t = Math.max(0, Math.min(1, ((px - ax) * segDx + (py - ay) * segDy) / lenSq));
		const projX = ax + t * segDx, projY = ay + t * segDy;
		return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
	}

	// ---- Particle System ----

	private spawnTrailParticle(x: number, y: number) {
		for (const p of this.particles) {
			if (p.life <= 0) {
				p.x = x + (Math.random() - 0.5) * 0.02;
				p.y = y + (Math.random() - 0.5) * 0.02;
				p.vx = (Math.random() - 0.5) * 0.02;
				p.vy = -0.02; // Slight upward drift (screen space y)
				p.alpha = 0.8 + Math.random() * 0.2;
				p.life = 1.0;
				p.type = Math.random();
				break;
			}
		}
	}

	private spawnClickParticle(cx: number, cy: number) {
		for (const p of this.particles) {
			if (p.life <= 0) {
				const angle = Math.random() * Math.PI * 2;
				const speed = 0.3 + Math.random() * 0.5;
				p.x = cx + Math.cos(angle) * 0.01;
				p.y = cy + Math.sin(angle) * 0.01;
				p.vx = Math.cos(angle) * speed;
				p.vy = Math.sin(angle) * speed;
				p.alpha = 1.0;
				p.life = 0.5 + Math.random() * 0.5;
				p.type = Math.random();
				break;
			}
		}
	}

	private updateParticles(dt: number) {
		for (const p of this.particles) {
			if (p.life > 0) {
				p.life -= dt * 1.5;
				p.alpha *= PARTICLE_FADE;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vx *= 0.95;
				p.vy *= 0.95;
			}
		}
	}

	// ---- Render ----

	private render(time: number, loopTime: number) {
		const gl = this.gl!;
		gl.bindVertexArray(this.quadVAO);

		const w = this.canvas.width;
		const h = this.canvas.height;

		// Cursor positions in UV space (Y-flipped)
		const cursorUvX = this.smoothCursorX;
		const cursorUvY = 1.0 - this.smoothCursorY;
		const realUvX = this.realCursorX;
		const realUvY = 1.0 - this.realCursorY;
		const clickUvX = this.clickX;
		const clickUvY = 1.0 - this.clickY;

		// Gravity multiplier: 0 for ghost-only, GRAVITY_MUL for real mouse
		const gravityMul = this.realActive * GRAVITY_MUL;

		// Velocity: scale by realActive so ghost doesn't trigger velocity effects
		const effectiveVelocity = this.cursorVelocity * this.realActive;

		// ---- 1. Fluid pass ----
		gl.useProgram(this.programs.fluid.program);
		const fu = this.programs.fluid.uniforms;
		gl.uniform1f(fu['uTime']!, time);
		gl.uniform1f(fu['uLoopTime']!, loopTime);
		gl.uniform2f(fu['uResolution']!, w, h);
		gl.uniform2f(fu['uCursor']!, cursorUvX, cursorUvY);
		gl.uniform1f(fu['uCursorVelocity']!, effectiveVelocity);
		gl.uniform1f(fu['uClickIntensity']!, this.clickIntensity);
		gl.uniform1f(fu['uGravityMul']!, gravityMul);
		gl.uniform2f(fu['uClickPos']!, clickUvX, clickUvY);
		this.blit(this.fluidFBO);

		// ---- 2. Glass pass (blended over scene) ----
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		gl.useProgram(this.programs.glass.program);
		const gu = this.programs.glass.uniforms;
		gl.uniform1f(gu['uTime']!, time);
		gl.uniform1f(gu['uLoopTime']!, loopTime);
		gl.uniform2f(gu['uResolution']!, w, h);
		gl.uniform2f(gu['uCursor']!, cursorUvX, cursorUvY);
		gl.uniform2f(gu['uRealCursor']!, realUvX, realUvY);
		gl.uniform1f(gu['uCursorActive']!, 1.0); // Ghost always active
		gl.uniform1f(gu['uRealActive']!, this.realActive);
		gl.uniform1f(gu['uCursorVelocity']!, effectiveVelocity);
		gl.uniform1f(gu['uClickIntensity']!, this.clickIntensity);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.fluidFBO.texture);
		gl.uniform1i(gu['uFluid']!, 0);
		this.blit(this.sceneFBO);

		gl.disable(gl.BLEND);

		// ---- 3. Particle pass ----
		gl.useProgram(this.programs.particle.program);
		const pu = this.programs.particle.uniforms;
		gl.uniform1f(pu['uFade']!, PARTICLE_FADE);

		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const p = this.particles[i];
			const loc = pu[`uParticles[${i}]`];
			if (loc) gl.uniform2f(loc, p.x, 1.0 - p.y);
			const alphaLoc = pu[`uParticleAlphas[${i}]`];
			if (alphaLoc) gl.uniform1f(alphaLoc, p.life > 0 ? p.alpha : 0);
			const typeLoc = pu[`uParticleTypes[${i}]`];
			if (typeLoc) gl.uniform1f(typeLoc, p.type);
		}

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.particleFBO.read.texture);
		gl.uniform1i(pu['uPrevious']!, 0);
		this.blit(this.particleFBO.write);
		this.particleFBO.swap();

		// ---- 4. Electric arc pass ----
		gl.useProgram(this.programs.electric.program);
		const eu = this.programs.electric.uniforms;
		gl.uniform1f(eu['uTime']!, time);
		gl.uniform1f(eu['uFade']!, 0.85);

		for (let i = 0; i < ELECTRIC_ARC_COUNT; i++) {
			const arc = this.arcs[i];
			const startLoc = eu[`uArcStarts[${i}]`];
			if (startLoc) gl.uniform2f(startLoc, arc.startX, arc.startY);
			const endLoc = eu[`uArcEnds[${i}]`];
			if (endLoc) gl.uniform2f(endLoc, arc.endX, arc.endY);
			const alphaLoc = eu[`uArcAlphas[${i}]`];
			if (alphaLoc) gl.uniform1f(alphaLoc, arc.alpha);
		}

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.electricFBO.read.texture);
		gl.uniform1i(eu['uPrevious']!, 0);
		this.blit(this.electricFBO.write);
		this.electricFBO.swap();

		// ---- 5. Post-processing to screen ----
		gl.useProgram(this.programs.post.program);
		const pp = this.programs.post.uniforms;
		gl.uniform1f(pp['uTime']!, time);
		gl.uniform2f(pp['uResolution']!, w, h);
		gl.uniform2f(pp['uCursor']!, cursorUvX, cursorUvY);
		gl.uniform1f(pp['uCursorActive']!, 1.0);
		gl.uniform1f(pp['uCursorVelocity']!, effectiveVelocity);
		gl.uniform1f(pp['uClickIntensity']!, this.clickIntensity);
		gl.uniform2f(pp['uVelocityDir']!, this.velocityDirX, -this.velocityDirY); // Y-flip for UV space

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
		gl.uniform1i(pp['uScene']!, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.particleFBO.read.texture);
		gl.uniform1i(pp['uParticles']!, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.electricFBO.read.texture);
		gl.uniform1i(pp['uElectricArcs']!, 2);

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
