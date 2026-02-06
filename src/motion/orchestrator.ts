import type { MotionSignal, MotionSignalName } from './recipes';

export type RivePlayerRegistration = {
	id: string;
	container: HTMLElement;
	stateMachine?: string;
	getInputNames: () => string[];
	onSignal: (signal: MotionSignal) => void;
};

type PlayerRuntime = RivePlayerRegistration & {
	cleanup: Array<() => void>;
	visible: boolean;
};

type MotionIntensity = 'calm' | 'editorial' | 'wild';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

class RiveOrchestrator {
	private players = new Map<string, PlayerRuntime>();
	private sectionObserver: IntersectionObserver | null = null;
	private chapterObserver: IntersectionObserver | null = null;
	private scrollRaf = 0;
	private hudEl: HTMLElement | null = null;
	private hudBodyEl: HTMLElement | null = null;
	private hudVisible = false;
	private heartbeatRaf = 0;
	private heartbeatFrames = 0;
	private heartbeatFps = 0;
	private heartbeatLast = 0;
	private initialized = false;
	private idleTimer: number | null = null;
	private idleMs = 6000;
	private isIdle = false;
	private reducedMotion = false;
	private lastRouteSignalAt = 0;
	private devSummaryTimer: number | null = null;
	private intensityMode: MotionIntensity = 'editorial';

	init() {
		if (typeof window === 'undefined' || this.initialized) return;
		this.initialized = true;
		this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.hudVisible = window.localStorage.getItem('motion-os:hud') === '1';
		this.intensityMode = this.readIntensityMode();
		this.applyIntensityMode();
		this.mountHud();
		this.setupObservers();
		this.bindGlobalSignals();
		this.startHeartbeat();
		this.scheduleIdleReset();
		this.startDevSummary();
		this.runIntroSequence();
	}

	registerPlayer(registration: RivePlayerRegistration) {
		this.init();
		if (this.players.has(registration.id)) {
			this.unregisterPlayer(registration.id);
		}

		const player: PlayerRuntime = {
			...registration,
			cleanup: [],
			visible: false,
		};

		const onEnter = () => {
			this.emitToPlayer(player.id, 'hover', { active: true });
		};
		const onLeave = () => {
			this.emitToPlayer(player.id, 'hover', { active: false });
		};
		const onFocus = () => {
			this.emitToPlayer(player.id, 'hover', { active: true });
		};
		const onBlur = () => {
			this.emitToPlayer(player.id, 'hover', { active: false });
		};
		const onClick = () => {
			this.emitToPlayer(player.id, 'click', { active: true });
		};

		registration.container.addEventListener('mouseenter', onEnter);
		registration.container.addEventListener('mouseleave', onLeave);
		registration.container.addEventListener('focusin', onFocus);
		registration.container.addEventListener('focusout', onBlur);
		registration.container.addEventListener('click', onClick);
		player.cleanup.push(() => {
			registration.container.removeEventListener('mouseenter', onEnter);
			registration.container.removeEventListener('mouseleave', onLeave);
			registration.container.removeEventListener('focusin', onFocus);
			registration.container.removeEventListener('focusout', onBlur);
			registration.container.removeEventListener('click', onClick);
		});

		this.players.set(player.id, player);
		this.sectionObserver?.observe(player.container);
		this.updateHud();
	}

	unregisterPlayer(id: string) {
		const existing = this.players.get(id);
		if (!existing) return;
		existing.cleanup.forEach((fn) => fn());
		existing.cleanup = [];
		this.sectionObserver?.unobserve(existing.container);
		this.players.delete(id);
		this.updateHud();
	}

	notifyRouteTransitionStart() {
		this.lastRouteSignalAt = Date.now();
		this.emit('route-transition-start', { active: true });
		const root = document.documentElement;
		root.classList.remove('motion-route-pulse');
		void root.offsetWidth;
		root.classList.add('motion-route-pulse');
		const duration = this.reducedMotion ? 120 : this.intensityMode === 'wild' ? 880 : this.intensityMode === 'editorial' ? 700 : 520;
		window.setTimeout(() => {
			root.classList.remove('motion-route-pulse');
		}, duration);
		this.updateHud();
	}

	notifyRouteTransitionEnd() {
		this.emit('route-transition-end', { active: false });
		this.updateHud();
	}

	private readIntensityMode(): MotionIntensity {
		const saved = window.localStorage.getItem('motion-os:intensity');
		if (saved === 'calm' || saved === 'editorial' || saved === 'wild') {
			return saved;
		}
		return import.meta.env.DEV ? 'wild' : 'editorial';
	}

	private applyIntensityMode() {
		const root = document.documentElement;
		root.dataset.motionIntensity = this.intensityMode;
		const strength = this.intensityMode === 'wild' ? 1 : this.intensityMode === 'editorial' ? 0.66 : 0.42;
		root.style.setProperty('--motion-strength', strength.toFixed(2));
	}

	private cycleIntensityMode() {
		this.intensityMode =
			this.intensityMode === 'calm'
				? 'editorial'
				: this.intensityMode === 'editorial'
					? 'wild'
					: 'calm';
		window.localStorage.setItem('motion-os:intensity', this.intensityMode);
		this.applyIntensityMode();
		this.updateHud();
	}

	private runIntroSequence() {
		if (this.reducedMotion) return;
		const seenKey = 'motion-os:intro-seen';
		const seen = window.sessionStorage.getItem(seenKey) === '1';
		if (seen) return;
		window.sessionStorage.setItem(seenKey, '1');
		const root = document.documentElement;
		root.classList.add('motion-intro-sequence');
		const duration = this.intensityMode === 'wild' ? 2500 : this.intensityMode === 'editorial' ? 1900 : 1200;
		window.setTimeout(() => {
			root.classList.remove('motion-intro-sequence');
		}, duration);
	}

	private setupObservers() {
		if (typeof window === 'undefined') return;
		if (!('IntersectionObserver' in window)) return;
		this.sectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const container = entry.target as HTMLElement;
					const id = container.dataset.riveId;
					if (!id) return;
					const player = this.players.get(id);
					if (!player) return;
					const nowVisible = entry.isIntersecting;
					if (nowVisible === player.visible) return;
					player.visible = nowVisible;
					this.emitToPlayer(id, nowVisible ? 'section-enter' : 'section-exit', {
						active: nowVisible,
						sectionId: container.closest('section')?.id,
					});
				});
				this.updateHud();
			},
			{ threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
		);

		this.chapterObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const el = entry.target as HTMLElement;
					if (entry.isIntersecting) {
						el.classList.add('motion-chapter-in');
					}
				});
			},
			{ threshold: 0.2, rootMargin: '0px 0px -12% 0px' }
		);

		document.querySelectorAll<HTMLElement>('[data-motion-chapter]').forEach((el, index) => {
			el.style.setProperty('--motion-chapter-index', String(index));
			this.chapterObserver?.observe(el);
		});
	}

	private bindGlobalSignals() {
		if (typeof window === 'undefined') return;

		const scheduleScroll = () => {
			if (this.scrollRaf) return;
			this.scrollRaf = window.requestAnimationFrame(() => {
				this.scrollRaf = 0;
				const root = document.documentElement;
				this.players.forEach((player) => {
					const rect = player.container.getBoundingClientRect();
					const viewport = Math.max(window.innerHeight, 1);
					const total = rect.height + viewport;
					const progress = clamp((viewport - rect.top) / Math.max(total, 1));
					this.emitToPlayer(player.id, 'scroll-progress', { progress });
				});

				const hero = document.querySelector<HTMLElement>('.hero-section');
				if (hero) {
					const rect = hero.getBoundingClientRect();
					const range = Math.max(rect.height, window.innerHeight * 0.8);
					const p = clamp((0 - rect.top) / range);
					root.style.setProperty('--motion-hero-progress', p.toFixed(4));
				}

				const specimen = document.getElementById('home-motion-moment');
				if (specimen) {
					const rect = specimen.getBoundingClientRect();
					const viewport = Math.max(window.innerHeight, 1);
					const total = rect.height + viewport;
					const p = clamp((viewport - rect.top) / Math.max(total, 1));
					root.style.setProperty('--motion-specimen-progress', p.toFixed(4));
				}

				this.updateHud();
			});
		};

		const onActivity = () => {
			if (this.isIdle) {
				this.isIdle = false;
				this.emit('idle-end', { active: false });
			}
			this.scheduleIdleReset();
		};

		window.addEventListener('scroll', scheduleScroll, { passive: true });
		window.addEventListener('resize', scheduleScroll);
		window.addEventListener('mousemove', onActivity, { passive: true });
		window.addEventListener('keydown', onActivity, { passive: true });
		window.addEventListener('click', onActivity, { passive: true });
		window.addEventListener('pointerdown', onActivity, { passive: true });
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				this.emit('idle-start', { active: true });
			}
		});

		window.addEventListener('keydown', (event) => {
			if (event.shiftKey && event.key.toLowerCase() === 'm') {
				event.preventDefault();
				this.toggleHud();
				return;
			}
			if (event.shiftKey && event.key.toLowerCase() === 'i') {
				event.preventDefault();
				this.cycleIntensityMode();
			}
		});

		scheduleScroll();
	}

	private emit(type: MotionSignalName, partial: Partial<MotionSignal>) {
		const signal: MotionSignal = {
			type,
			timestamp: Date.now(),
			...partial,
		};
		this.players.forEach((player) => {
			player.onSignal(signal);
		});
	}

	private emitToPlayer(id: string, type: MotionSignalName, partial: Partial<MotionSignal>) {
		const player = this.players.get(id);
		if (!player) return;
		const signal: MotionSignal = {
			type,
			timestamp: Date.now(),
			...partial,
		};
		player.onSignal(signal);
	}

	private mountHud() {
		if (typeof document === 'undefined') return;
		if (this.hudEl) return;

		const hud = document.createElement('aside');
		hud.className = 'motion-os-hud';
		hud.setAttribute('aria-live', 'polite');
		hud.setAttribute('aria-label', 'Motion debug HUD');
		hud.hidden = !this.hudVisible;

		const head = document.createElement('div');
		head.className = 'motion-os-hud__head';
		head.textContent = 'MOTION OS';

		const body = document.createElement('pre');
		body.className = 'motion-os-hud__body';

		hud.appendChild(head);
		hud.appendChild(body);
		document.body.appendChild(hud);

		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.className = 'motion-os-hud-toggle';
		toggle.textContent = 'Motion HUD';
		toggle.setAttribute('aria-pressed', this.hudVisible ? 'true' : 'false');
		toggle.addEventListener('click', () => {
			this.toggleHud();
			toggle.setAttribute('aria-pressed', this.hudVisible ? 'true' : 'false');
		});
		document.body.appendChild(toggle);

		const intensity = document.createElement('button');
		intensity.type = 'button';
		intensity.className = 'motion-os-intensity-toggle';
		intensity.textContent = `Intensity: ${this.intensityMode}`;
		intensity.addEventListener('click', () => {
			this.cycleIntensityMode();
			intensity.textContent = `Intensity: ${this.intensityMode}`;
		});
		document.body.appendChild(intensity);

		this.hudEl = hud;
		this.hudBodyEl = body;
		this.updateHud();
	}

	private toggleHud() {
		this.hudVisible = !this.hudVisible;
		if (this.hudEl) {
			this.hudEl.hidden = !this.hudVisible;
		}
		window.localStorage.setItem('motion-os:hud', this.hudVisible ? '1' : '0');
		this.updateHud();
	}

	private updateHud() {
		if (!this.hudBodyEl) return;
		const lines: string[] = [];
		lines.push(`players: ${this.players.size}`);
		lines.push(`heartbeat: ${this.heartbeatFps.toFixed(0)} fps-ish`);
		lines.push(`reducedMotion: ${this.reducedMotion ? 'true' : 'false'}`);
		lines.push(`intensity: ${this.intensityMode}`);
		if (this.lastRouteSignalAt) {
			lines.push(`routeSignal: ${Math.max(0, Math.round((Date.now() - this.lastRouteSignalAt) / 1000))}s ago`);
		}
		this.players.forEach((player) => {
			const inputs = player.getInputNames();
			lines.push(
				`${player.id} | ${player.stateMachine ?? 'no-machine'} | ${inputs.length ? inputs.join(',') : 'no-inputs'}`
			);
		});
		this.hudBodyEl.textContent = lines.join('\n');
	}

	private startHeartbeat() {
		if (typeof window === 'undefined') return;
		const tick = (ts: number) => {
			if (!this.heartbeatLast) this.heartbeatLast = ts;
			this.heartbeatFrames += 1;
			const elapsed = ts - this.heartbeatLast;
			if (elapsed >= 1000) {
				this.heartbeatFps = (this.heartbeatFrames * 1000) / elapsed;
				this.heartbeatFrames = 0;
				this.heartbeatLast = ts;
				this.updateHud();
			}
			this.heartbeatRaf = window.requestAnimationFrame(tick);
		};
		this.heartbeatRaf = window.requestAnimationFrame(tick);
	}

	private scheduleIdleReset() {
		if (typeof window === 'undefined') return;
		if (this.idleTimer) {
			window.clearTimeout(this.idleTimer);
		}
		this.idleTimer = window.setTimeout(() => {
			this.isIdle = true;
			this.emit('idle-start', { active: true });
			this.updateHud();
		}, this.idleMs);
	}

	private startDevSummary() {
		if (!import.meta.env.DEV) return;
		if (this.devSummaryTimer) return;
		this.devSummaryTimer = window.setInterval(() => {
			const count = this.players.size;
			const visible = Array.from(this.players.values()).filter((player) => player.visible).length;
			console.info(
				`[MotionOS] players=${count} visible=${visible} reduced=${this.reducedMotion} heartbeat=${this.heartbeatFps.toFixed(0)}fps-ish idle=${this.isIdle} intensity=${this.intensityMode}`
			);
		}, 10000);
	}
}

let singleton: RiveOrchestrator | null = null;

export const getRiveOrchestrator = () => {
	if (!singleton) {
		singleton = new RiveOrchestrator();
	}
	return singleton;
};

export const initMotionOS = () => {
	const orchestrator = getRiveOrchestrator();
	orchestrator.init();
};

export const notifyRouteTransitionStart = () => {
	getRiveOrchestrator().notifyRouteTransitionStart();
};

export const notifyRouteTransitionEnd = () => {
	getRiveOrchestrator().notifyRouteTransitionEnd();
};
