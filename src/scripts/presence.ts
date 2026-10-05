/*
 * Presence: what the site does when you leave its tab and when you come back.
 *
 *  - Away: the tab title becomes "Still here." and the favicon becomes the sigil.
 *  - Back (after more than a couple of seconds): the page rises out of black,
 *    and, if the visitor has switched sound on, one low tone sounds.
 *
 * Sound is opt-in (footer toggle, off by default, remembered). Browsers refuse
 * audio until the visitor has interacted, so the AudioContext is only created
 * from the toggle's click. The tone is generated here; there is no audio file.
 * Reduced-motion visitors keep the title and favicon change but skip the fade.
 */

const AWAY_TITLE = 'Still here.';
const MIN_AWAY_MS = 2000;
const STORAGE_KEY = 'site-sound';

const SIGIL_FAVICON =
	'data:image/svg+xml,' +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0f0e0d"/><g fill="none" stroke="#f6f5f1" stroke-width="1.4"><circle cx="16" cy="16" r="11"/><path d="M16 25.5 6.8 10h18.4z"/></g><circle cx="16" cy="16" r="1.5" fill="#f6f5f1"/></svg>`,
	);

let awaySince = 0;
let savedTitle = '';
let savedIcons: { link: HTMLLinkElement; href: string }[] = [];
let ctx: AudioContext | null = null;
let fade: HTMLDivElement | null = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function soundOn(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'on';
	} catch {
		return false;
	}
}

function setSound(on: boolean) {
	try {
		localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
	} catch {
		/* private mode: the toggle still works for this page view */
	}
	if (on) {
		// Created inside the click handler, which is what lets browsers allow it.
		ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
		void ctx.resume();
	}
	syncToggle(on);
}

function syncToggle(on = soundOn()) {
	document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((btn) => {
		btn.setAttribute('aria-pressed', String(on));
		btn.textContent = on ? 'Sound: on' : 'Sound: off';
	});
}

/** One low, slow tone: two sines a fifth apart through a low-pass, ~2s. */
function playTone(length = 2) {
	if (!ctx || ctx.state !== 'running') return;
	const now = ctx.currentTime;
	const out = ctx.createGain();
	out.gain.setValueAtTime(0.0001, now);
	out.gain.exponentialRampToValueAtTime(0.05, now + 0.5);
	out.gain.exponentialRampToValueAtTime(0.0001, now + length);

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 320;

	for (const freq of [73.4, 110]) {
		const osc = ctx.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = freq;
		osc.connect(filter);
		osc.start(now);
		osc.stop(now + length + 0.1);
	}
	filter.connect(out).connect(ctx.destination);
}

function riseFromBlack() {
	if (reducedMotion()) return;
	if (!fade) {
		fade = document.createElement('div');
		fade.setAttribute('aria-hidden', 'true');
		fade.style.cssText =
			'position:fixed;inset:0;z-index:9999;background:#070606;pointer-events:none;opacity:0;transition:opacity 1.6s cubic-bezier(.2,.6,.2,1)';
		document.documentElement.appendChild(fade);
	}
	const el = fade;
	el.style.transition = 'none';
	el.style.opacity = '0.92';
	void el.offsetWidth; // commit the starting frame before easing out
	el.style.transition = 'opacity 1.6s cubic-bezier(.2,.6,.2,1)';
	el.style.opacity = '0';
}

function leave() {
	awaySince = Date.now();
	savedTitle = document.title;
	document.title = AWAY_TITLE;
	savedIcons = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')].map((link) => ({
		link,
		href: link.href,
	}));
	savedIcons.forEach(({ link }) => {
		link.type = 'image/svg+xml';
		link.href = SIGIL_FAVICON;
	});
}

function comeBack() {
	// A page swap while away already installed the new page's title; leave it.
	if (document.title === AWAY_TITLE && savedTitle) document.title = savedTitle;
	savedIcons.forEach(({ link, href }) => {
		if (link.isConnected) link.href = href;
	});
	savedIcons = [];
	const awayFor = awaySince ? Date.now() - awaySince : 0;
	awaySince = 0;
	if (awayFor < MIN_AWAY_MS) return;
	riseFromBlack();
	if (soundOn()) {
		void ctx?.resume().then(() => playTone());
	}
}

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') leave();
	else comeBack();
});

// Delegated, so it survives view-transition swaps of the footer.
document.addEventListener('click', (event) => {
	const btn = (event.target as Element | null)?.closest('[data-sound-toggle]');
	if (!btn) return;
	const next = !soundOn();
	setSound(next);
	if (next) playTone(1.2); // short confirmation that sound works
});

document.addEventListener('astro:page-load', () => syncToggle());
syncToggle();
