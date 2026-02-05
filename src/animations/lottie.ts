type LottieModule = typeof import('lottie-web');

type LottieInstance = {
	play: () => void;
	pause: () => void;
	destroy: () => void;
	goToAndStop: (value: number, isFrame: boolean) => void;
	addEventListener: (event: string, cb: () => void) => void;
};

type LottieCleanup = () => void;

const instances = new Map<HTMLElement, LottieCleanup>();

const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const parseBoolean = (value: string | null, fallback: boolean) => {
	if (value === null) return fallback;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return fallback;
};

const loadLottie = (() => {
	let cached: Promise<LottieModule> | null = null;
	return () => {
		if (!cached) {
			cached = import('lottie-web');
		}
		return cached;
	};
})();

const setupInstance = async (container: HTMLElement) => {
	if (container.dataset.lottieInit === 'true') return;
	const src = container.dataset.lottieSrc;
	if (!src) return;

	container.dataset.lottieInit = 'true';

	const loop = parseBoolean(container.dataset.lottieLoop, true);
	const speed = container.dataset.lottieSpeed
		? Number(container.dataset.lottieSpeed)
		: 1;

	const lottie = await loadLottie();
	const animation = lottie.loadAnimation({
		container,
		renderer: 'svg',
		loop,
		autoplay: false,
		path: src,
		rendererSettings: {
			preserveAspectRatio: 'xMidYMid meet',
		},
	});

	animation.addEventListener('DOMLoaded', () => {
		animation.goToAndStop(0, true);
	});

	if (speed !== 1 && typeof (animation as any).setSpeed === 'function') {
		(animation as any).setSpeed(speed);
	}

	if (prefersReducedMotion()) {
		animation.goToAndStop(0, true);
		instances.set(container, () => animation.destroy());
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					animation.play();
				} else {
					animation.pause();
				}
			});
		},
		{ threshold: 0.25 }
	);

	observer.observe(container);

	instances.set(container, () => {
		observer.disconnect();
		animation.destroy();
	});
};

export const initLotties = (root: ParentNode = document) => {
	if (typeof window === 'undefined') return;
	const containers = Array.from(
		root.querySelectorAll<HTMLElement>('[data-lottie]')
	);
	if (!containers.length) return;
	containers.forEach((container) => {
		void setupInstance(container);
	});
};

export const cleanupLotties = () => {
	instances.forEach((cleanup) => cleanup());
	instances.clear();
};
