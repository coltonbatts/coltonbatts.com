/* -----------------------------------------------------------
 * DARKROOM — GLSL ES 3.00 sources
 *
 * Four small programs. Three run once per image to bake the
 * halation layer; one (PRINT) runs per frame while a plate is
 * developing and otherwise not at all.
 *
 * All colour math is done in display (sRGB) space on purpose:
 * the fallback look is a CSS `saturate() contrast()` filter,
 * which also operates in sRGB, so the print matches it exactly
 * when the effects are dialled to zero.
 *
 * Texture convention: uploads use UNPACK_FLIP_Y, so uv (0,0) is
 * the bottom-left of the image, same as the GL framebuffer.
 * ----------------------------------------------------------- */

/**
 * One oversized triangle that covers the viewport, generated from
 * gl_VertexID — no vertex buffer, no attributes, nothing to bind.
 */
export const VERTEX = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Halation, step 1: find the light sources.
 *
 * On colour negative film, bright light passes through the emulsion,
 * reflects off the film base, and re-exposes the bottom (red-sensitive)
 * layer — so every strong highlight grows a red-orange halo, whatever
 * colour the light was. Stocks without an anti-halation backing
 * (CineStill 800T) make it famous.
 *
 * We measure brightness as the max channel, not luma: a pure red lamp
 * has a luma of ~0.21 but is one of the brightest things in the frame,
 * and it's exactly the light that should bloom in these photographs.
 *
 * This pass also does the 4× downsample. Four bilinear taps one source
 * texel off-centre cover the whole 4×4 block, so a lamp a few pixels
 * wide can't fall between samples.
 */
export const HIGHLIGHT = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uTexel;
uniform float uThreshold;
out vec4 outColor;
float lamp(vec2 uv) {
	vec3 c = texture(uImage, uv).rgb;
	float peak = max(c.r, max(c.g, c.b));
	return smoothstep(uThreshold, 1.0, peak) * peak;
}
void main() {
	vec2 d = uTexel;
	float mask = lamp(vUv + vec2(-d.x, -d.y)) + lamp(vUv + vec2(d.x, -d.y))
		+ lamp(vUv + vec2(-d.x, d.y)) + lamp(vUv + vec2(d.x, d.y));
	outColor = vec4(mask * 0.25, 0.0, 0.0, 1.0);
}`;

/**
 * Halation, step 2: spread it. A separable 9-tap Gaussian (sigma ≈ 2
 * taps) run horizontally then vertically, twice, at quarter resolution.
 * uStep is one texel along the pass direction, scaled by the spread.
 */
export const BLUR = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uStep;
out vec4 outColor;
const float W[5] = float[5](0.2270270, 0.1945946, 0.1216216, 0.0540540, 0.0162162);
void main() {
	float sum = texture(uSource, vUv).r * W[0];
	for (int i = 1; i < 5; i++) {
		vec2 o = uStep * float(i);
		sum += texture(uSource, vUv + o).r * W[i];
		sum += texture(uSource, vUv - o).r * W[i];
	}
	outColor = vec4(sum, 0.0, 0.0, 1.0);
}`;

/**
 * The print.
 *
 * 1. Grade — the CSS fallback's saturate/contrast, reproduced so the
 *    hover and the resting state look the same with or without WebGL.
 * 2. Halation — the baked glow, tinted red-orange and screen-blended,
 *    so it can only lighten, like extra exposure.
 * 3. Grain — silver clumps are fixed in the emulsion, so the grain is a
 *    static pattern keyed to pixel position (a print, not a projection).
 *    Two hashes summed give a triangular distribution, which reads as
 *    grain rather than digital noise. It's strongest in the midtones:
 *    blacks are fully dense and paper white has no silver to clump.
 * 4. Develop — on paper in the tray, density builds fastest where the
 *    exposure was heaviest, so shadows arrive first and highlights last.
 *    Each pixel's clock is delayed by its brightness, then run through a
 *    toe-and-shoulder (H&D-style) curve toward its final density.
 *    uDevelop = 0 is unexposed paper; 1 is the finished print.
 */
export const PRINT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uHalo;
uniform vec2 uCropScale;
uniform vec2 uCropOffset;
uniform vec2 uResolution;
uniform vec3 uPaper;
uniform float uDevelop;
uniform float uSaturation;
uniform float uContrast;
uniform float uHalation;
uniform float uGrain;
uniform float uSeed;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 HALO_TINT = vec3(1.0, 0.28, 0.12);

float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

void main() {
	vec2 uv = vUv * uCropScale + uCropOffset;
	vec3 c = texture(uImage, uv).rgb;

	float l = dot(c, LUMA);
	c = mix(vec3(l), c, uSaturation);
	c = (c - 0.5) * uContrast + 0.5;

	float halo = texture(uHalo, uv).r * uHalation;
	c = 1.0 - (1.0 - c) * (1.0 - HALO_TINT * halo);

	vec2 px = floor(vUv * uResolution) + uSeed;
	float n = hash(px) + hash(px + vec2(19.19, 7.73)) - 1.0;
	l = clamp(dot(c, LUMA), 0.0, 1.0);
	c += n * uGrain * (4.0 * l * (1.0 - l));

	float t = clamp(uDevelop * 1.35 - l * 0.35, 0.0, 1.0);
	float density = t * t * (3.0 - 2.0 * t);
	c = mix(uPaper, clamp(c, 0.0, 1.0), density);

	outColor = vec4(c, 1.0);
}`;
