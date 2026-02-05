type RiveModule = typeof import('@rive-app/canvas');

type RiveInstance = import('@rive-app/canvas').Rive;

type RiveInputValue = boolean | number | string;

type RiveInputs = Record<string, RiveInputValue>;

type RiveMode = 'play-when-visible' | 'always';

type RiveInitOptions = {
	src?: string;
	artboard?: string;
	stateMachine?: string;
	autoplay?: boolean;
	mode?: RiveMode;
	inputs?: RiveInputs;
};

type RiveCleanup = () => void;

const instances = new Map<HTMLElement, RiveCleanup>();

export const prefersReducedMotion = () => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const parseBoolean = (value: string | null, fallback: boolean) => {
	if (value === null) return fallback;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return fallback;
};

const parseInputs = (value: string | null): RiveInputs | undefined => {
	if (!value) return undefined;
	try {
		const parsed = JSON.parse(value);
		if (!parsed || typeof parsed !== 'object') return undefined;
		return parsed as RiveInputs;
	} catch {
		return undefined;
	}
};

const loadRive = (() => {
	let cached: Promise<RiveModule> | null = null;
	return () => {
		if (!cached) {
			cached = import('@rive-app/canvas');
		}
		return cached;
	};
})();

const applyInputs = (
	rive: RiveInstance,
	stateMachine: string | undefined,
	inputs: RiveInputs | undefined
) => {
	if (!stateMachine || !inputs) return;
	const machineInputs = rive.stateMachineInputs(stateMachine);
	if (!machineInputs?.length) return;

	machineInputs.forEach((input) => {
		if (!(input.name in inputs)) return;
		const value = inputs[input.name];

		if (typeof value === 'boolean' || typeof value === 'number') {
			input.value = value;
			return;
		}

		if (typeof value === 'string') {
			if (value === 'fire' || value === 'trigger') {
				if (typeof input.fire === 'function') {
					input.fire();
				}
				return;
			}

			if (value === 'true' || value === 'false') {
				input.value = value === 'true';
				return;
			}

			const numeric = Number(value);
			if (!Number.isNaN(numeric)) {
				input.value = numeric;
			}
		}
	});
};

export const initRiveCanvas = async (
	container: HTMLElement,
	options: RiveInitOptions = {}
) => {
	if (typeof window === 'undefined') return;
	if (instances.has(container) || container.dataset.riveInit === 'true') return;

	const src = options.src ?? container.dataset.riveSrc;
	if (!src) return;

	container.dataset.riveInit = 'true';

	const artboard = options.artboard ?? container.dataset.riveArtboard ?? undefined;
	const stateMachine =
		options.stateMachine ?? container.dataset.riveStateMachine ?? undefined;
	const autoplay =
		options.autoplay ?? parseBoolean(container.dataset.riveAutoplay, true);
	const mode =
		options.mode ??
		(container.dataset.riveMode as RiveMode | undefined) ??
		'play-when-visible';
	const inputs = options.inputs ?? parseInputs(container.dataset.riveInputs);

	const { Rive } = await loadRive();

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.display = 'block';
	container.appendChild(canvas);

	const reduced = prefersReducedMotion();
	const shouldAutoplay = autoplay && !reduced;

	let observer: IntersectionObserver | null = null;

	const rive = new Rive({
		src,
		canvas,
		autoplay: mode === 'always' ? shouldAutoplay : false,
		artboard,
		stateMachines: stateMachine,
		onLoad: () => {
			applyInputs(rive, stateMachine, inputs);

			if (reduced) {
				rive.pause();
				return;
			}

			if (mode === 'always') {
				if (shouldAutoplay) {
					rive.play();
				}
				return;
			}

			if (!shouldAutoplay) {
				rive.pause();
			}
		},
	});

	if (mode === 'play-when-visible' && shouldAutoplay) {
		if ('IntersectionObserver' in window) {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							rive.play();
						} else {
							rive.pause();
						}
					});
				},
				{ threshold: 0.25 }
			);
			observer.observe(container);
		} else {
			rive.play();
		}
	}

	const cleanup = () => {
		observer?.disconnect();
		observer = null;
		rive.cleanup();
		if (container.contains(canvas)) {
			container.removeChild(canvas);
		}
		container.dataset.riveInit = 'false';
		instances.delete(container);
	};

	instances.set(container, cleanup);
};

export const cleanupRiveCanvas = (container: HTMLElement) => {
	const cleanup = instances.get(container);
	if (cleanup) cleanup();
};

export const cleanupRives = () => {
	instances.forEach((cleanup) => cleanup());
	instances.clear();
};
