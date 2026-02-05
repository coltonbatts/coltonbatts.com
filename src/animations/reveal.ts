const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let observer: IntersectionObserver | null = null;

export const initReveal = (root: ParentNode = document) => {
	if (typeof window === 'undefined') return;
	const elements = Array.from(
		root.querySelectorAll<HTMLElement>('[data-reveal]')
	);
	if (!elements.length) return;

	const reduced = prefersReducedMotion();

	if (reduced) {
		elements.forEach((element) => {
			element.classList.add('reveal', 'reveal--visible', 'reveal--instant');
			element.dataset.revealInit = 'true';
		});
		return;
	}

	if (observer) {
		observer.disconnect();
	}

	observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const target = entry.target as HTMLElement;
					target.classList.add('reveal--visible');
					observer?.unobserve(target);
				}
			});
		},
		{ threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
	);

	elements.forEach((element) => {
		if (element.dataset.revealInit === 'true') return;
		element.dataset.revealInit = 'true';
		element.classList.add('reveal');
		observer?.observe(element);
	});
};

export const cleanupReveal = () => {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
};
