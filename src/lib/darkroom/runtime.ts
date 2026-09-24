/* -----------------------------------------------------------
 * DARKROOM — the page runtime
 *
 * Finds the [data-darkroom] boxes, puts a canvas over each <img>,
 * and decides when to print: plates develop on first view, the
 * hero fades straight to a finished print, hover opens the grade.
 *
 * Loaded on demand by src/components/Darkroom.astro, which has
 * already checked reduced motion, Save-Data and the ?darkroom=0
 * escape hatch, and waited for load + idle. `start` runs once per
 * page; `stop` releases everything before a ClientRouter swap.
 * ----------------------------------------------------------- */

import { DarkroomEngine, type Negative, type PrintParams } from './engine';

/** Time for a plate to go from paper white to a finished print. */
const DEVELOP_MS = 1800;
/** Hover transition, matching the CSS fallback's `.6s linear`. */
const PUSH_MS = 600;
/** Sharp on retina without printing 3× canvases on phones. */
const MAX_DPR = 2;

/**
 * Resting and hovered grade. Plates rest at the CSS fallback's
 * `saturate(.7) contrast(1.06)` and open up to full colour on hover.
 * The hero has no filter in CSS, so it has no grade to animate.
 */
const GRADE = {
	develop: { rest: [0.7, 1.06], hover: [1, 1] },
	print: { rest: [1, 1], hover: [1, 1] },
} as const;
const HALATION = 0.6;
const GRAIN = 0.075;

type Mode = keyof typeof GRADE;

interface Plate {
	root: HTMLElement;
	img: HTMLImageElement;
	mode: Mode;
	seed: number;
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D | null;
	negative: Negative | null;
	/** Texture size and crop the current negative was made for. */
	fit: { tw: number; th: number; scale: [number, number]; offset: [number, number] } | null;
	/** 0–1, linear in time; eased before it reaches the shader. */
	develop: number;
	developing: boolean;
	/** 0 = resting grade, 1 = hover grade. */
	tone: number;
	toneTarget: number;
	visible: boolean;
}

let engine: DarkroomEngine | null = null;
let engineFailed = false;
let plates: Plate[] = [];
let paper: [number, number, number] = [1, 1, 1];
let raf = 0;
let lastFrame = 0;
let teardown: (() => void) | null = null;

function readPaper(): [number, number, number] {
	const hex = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
	const match = /^#([0-9a-f]{6})$/i.exec(hex);
	if (!match) return [1, 1, 1];
	const n = parseInt(match[1], 16);
	return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * The chosen file's real pixel size. With a `w`-descriptor srcset,
 * naturalWidth is density-corrected (a 1280px file picked at DPR 3 on a
 * 390px screen reports ~427), so the width comes from the srcset entry
 * that matches currentSrc instead.
 */
function sourcePixels(img: HTMLImageElement): [number, number] {
	const ratio = img.naturalHeight / img.naturalWidth;
	const current = new URL(img.currentSrc, location.href).pathname;
	for (const candidate of img.srcset.split(',')) {
		const [url, descriptor] = candidate.trim().split(/\s+/);
		if (!url || !descriptor?.endsWith('w')) continue;
		if (new URL(url, location.href).pathname !== current) continue;
		const w = parseInt(descriptor, 10);
		return [w, Math.round(w * ratio)];
	}
	return [img.naturalWidth, img.naturalHeight];
}

/** Paper takes up developer fast, then slows as density approaches its maximum. */
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Size the canvas to the image's box, and work out which part of the
 * image the box shows. Plates show all of it; the hero is
 * object-fit: cover, so the crop is reproduced from its computed
 * object-position. Returns true if the canvas was resized.
 */
function layout(plate: Plate): boolean {
	const { img, canvas } = plate;
	if (!canvas) return false;
	const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
	const boxW = img.clientWidth;
	const boxH = img.clientHeight;
	const cw = Math.max(1, Math.round(boxW * dpr));
	const ch = Math.max(1, Math.round(boxH * dpr));
	const [iw, ih] = sourcePixels(img);

	let scale: [number, number] = [1, 1];
	let offset: [number, number] = [0, 0];
	let tw = cw;
	let th = ch;

	const style = getComputedStyle(img);
	if (style.objectFit === 'cover') {
		const s = Math.max(boxW / iw, boxH / ih);
		const fx = boxW / (iw * s);
		const fy = boxH / (ih * s);
		const [px, py] = style.objectPosition
			.split(' ')
			.map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
		scale = [fx, fy];
		// Texture v runs bottom-up, so the vertical offset is mirrored.
		offset = [(1 - fx) * px, (1 - fy) * (1 - (py ?? 0.5))];
		tw = Math.round(iw * s * dpr);
		th = Math.round(ih * s * dpr);
	}

	// Never upload more pixels than the file has.
	const cap = Math.min(1, iw / tw, ih / th);
	tw = Math.max(1, Math.round(tw * cap));
	th = Math.max(1, Math.round(th * cap));

	const fit = plate.fit;
	if (!fit || fit.tw !== tw || fit.th !== th || fit.offset[0] !== offset[0] || fit.offset[1] !== offset[1]) {
		release(plate);
		plate.fit = { tw, th, scale, offset };
	}

	if (canvas.width === cw && canvas.height === ch) return false;
	canvas.width = cw;
	canvas.height = ch;
	return true;
}

function ensureNegative(plate: Plate): Negative | null {
	if (!engine || !plate.fit) return null;
	plate.negative ??= engine.develop(plate.img, plate.fit.tw, plate.fit.th);
	return plate.negative;
}

function release(plate: Plate) {
	if (plate.negative && engine) engine.release(plate.negative);
	plate.negative = null;
}

function draw(plate: Plate) {
	const negative = ensureNegative(plate);
	if (!engine || !negative || !plate.ctx || !plate.fit) return;
	const grade = GRADE[plate.mode];
	const params: PrintParams = {
		develop: easeOut(plate.develop),
		saturation: mix(grade.rest[0], grade.hover[0], plate.tone),
		contrast: mix(grade.rest[1], grade.hover[1], plate.tone),
		halation: HALATION,
		grain: GRAIN,
		seed: plate.seed,
		paper,
		cropScale: plate.fit.scale,
		cropOffset: plate.fit.offset,
	};
	engine.render(negative, plate.ctx, params);
}

function animating(plate: Plate): boolean {
	return plate.developing || plate.tone !== plate.toneTarget;
}

/**
 * The only animation loop. Runs while at least one plate is changing
 * and stops itself when none are; rAF also stops in background tabs.
 * A plate that scrolls out mid-develop is paused, not finished.
 */
function tick(now: number) {
	const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16;
	lastFrame = now;
	let busy = false;

	for (const plate of plates) {
		if (!animating(plate) || !plate.visible) continue;

		if (plate.developing) {
			plate.develop = Math.min(1, plate.develop + dt / DEVELOP_MS);
			if (plate.develop >= 1) plate.developing = false;
		}
		if (plate.tone !== plate.toneTarget) {
			const step = dt / PUSH_MS;
			plate.tone = plate.toneTarget > plate.tone
				? Math.min(plate.toneTarget, plate.tone + step)
				: Math.max(plate.toneTarget, plate.tone - step);
		}

		draw(plate);
		if (animating(plate)) busy = true;
		else release(plate);
	}

	raf = busy ? requestAnimationFrame(tick) : 0;
	if (!busy) lastFrame = 0;
}

function wake() {
	if (!raf) raf = requestAnimationFrame(tick);
}

function inViewport(el: Element): boolean {
	const r = el.getBoundingClientRect();
	return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

async function whenDecoded(img: HTMLImageElement): Promise<boolean> {
	if (!img.complete) {
		await new Promise((resolve) => {
			img.addEventListener('load', resolve, { once: true });
			img.addEventListener('error', resolve, { once: true });
		});
	}
	if (!img.naturalWidth) return false;
	await img.decode().catch(() => {});
	return true;
}

/**
 * Put the canvas in place. A develop plate that's still off screen is
 * laid down as blank paper, waiting; anything already visible goes
 * straight to the finished print, so a picture the visitor is looking
 * at never blanks out.
 */
async function arm(plate: Plate, isCurrent: () => boolean) {
	if (plate.canvas || !(await whenDecoded(plate.img)) || !isCurrent() || !engine) return;

	const canvas = document.createElement('canvas');
	canvas.className = 'darkroom-canvas';
	canvas.setAttribute('aria-hidden', 'true');
	plate.canvas = canvas;
	plate.ctx = canvas.getContext('2d', { alpha: false });
	layout(plate);

	const waiting = plate.mode === 'develop' && !inViewport(plate.root);
	plate.develop = waiting ? 0 : 1;
	draw(plate);
	if (!plate.negative) {
		plate.canvas = plate.ctx = null;
		return;
	}
	if (!animating(plate)) release(plate);

	plate.img.after(canvas);
	// Offscreen paper appears at once; a visible print eases in over the image.
	if (waiting) plate.root.classList.add('is-live', 'is-instant');
	else requestAnimationFrame(() => plate.root.classList.add('is-live'));
}

/** GPU reset or driver crash: remove every canvas and let the images show. */
function abandon() {
	engine = null;
	engineFailed = true;
	teardown?.();
	document.querySelectorAll('.darkroom-canvas').forEach((canvas) => canvas.remove());
	document.querySelectorAll('[data-darkroom].is-live').forEach((el) => el.classList.remove('is-live', 'is-instant'));
}

export function stop() {
	teardown?.();
}

export function start() {
	stop();
	const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-darkroom]'));
	if (!roots.length || engineFailed) return;

	engine ??= DarkroomEngine.create(abandon);
	if (!engine) {
		engineFailed = true;
		return;
	}
	paper = readPaper();

	let current = true;
	const isCurrent = () => current;

	plates = roots.flatMap((root, index): Plate[] => {
		const img = root.querySelector('img');
		const mode: Mode = root.dataset.darkroom === 'print' ? 'print' : 'develop';
		if (!img) return [];
		return [{
			root, img, mode,
			seed: (index * 97.13) % 1000,
			canvas: null, ctx: null, negative: null, fit: null,
			develop: 0, developing: false,
			tone: 0, toneTarget: 0,
			visible: mode === 'print',
		}];
	});
	const byRoot = new Map(plates.map((plate) => [plate.root, plate]));

	// Arm plates a little before they arrive, so the paper is down in time.
	const near = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			near.unobserve(entry.target);
			const plate = byRoot.get(entry.target as HTMLElement);
			if (plate) arm(plate, isCurrent);
		}
	}, { rootMargin: '50% 0px' });

	// Develop on first real view; pause anything that leaves mid-develop.
	const view = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			const plate = byRoot.get(entry.target as HTMLElement);
			if (!plate) continue;
			plate.visible = entry.isIntersecting;
			if (entry.isIntersecting && plate.canvas && plate.develop < 1) plate.developing = true;
			if (animating(plate)) wake();
		}
	}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

	// Re-print at the new size; the canvas clear and redraw share a task, so nothing flashes.
	let resizeQueued = 0;
	const resize = new ResizeObserver(() => {
		cancelAnimationFrame(resizeQueued);
		resizeQueued = requestAnimationFrame(() => {
			for (const plate of plates) {
				if (!plate.canvas || !layout(plate)) continue;
				draw(plate);
				if (!animating(plate)) release(plate);
			}
		});
	});

	const hoverTargets: Array<[HTMLElement, (e: Event) => void]> = [];
	for (const plate of plates) {
		resize.observe(plate.img);
		if (plate.mode === 'print') {
			arm(plate, isCurrent);
			continue;
		}
		near.observe(plate.root);
		view.observe(plate.root);

		const target = plate.root.closest<HTMLElement>('.art-plate') ?? plate.root;
		const onHover = (event: Event) => {
			if (!plate.canvas) return;
			plate.toneTarget = event.type === 'pointerenter' ? 1 : 0;
			if (animating(plate)) wake();
		};
		target.addEventListener('pointerenter', onHover);
		target.addEventListener('pointerleave', onHover);
		hoverTargets.push([target, onHover]);
	}

	teardown = () => {
		current = false;
		cancelAnimationFrame(raf);
		cancelAnimationFrame(resizeQueued);
		raf = lastFrame = 0;
		near.disconnect();
		view.disconnect();
		resize.disconnect();
		for (const [target, onHover] of hoverTargets) {
			target.removeEventListener('pointerenter', onHover);
			target.removeEventListener('pointerleave', onHover);
		}
		plates.forEach(release);
		plates = [];
		teardown = null;
	};
}
