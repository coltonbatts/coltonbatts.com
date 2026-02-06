type SectionMeta = {
	el: HTMLElement;
	id: string;
	item: HTMLAnchorElement;
};

let observer: IntersectionObserver | null = null;
let raf = 0;
let sectionMeta: SectionMeta[] = [];
let cleanupFns: Array<() => void> = [];

const prefersReducedMotion = () =>
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const updateProgress = (rail: HTMLElement) => {
	const top = window.scrollY || document.documentElement.scrollTop || 0;
	const max = Math.max(
		document.documentElement.scrollHeight - window.innerHeight,
		1
	);
	const progress = Math.max(0, Math.min(1, top / max));
	rail.style.setProperty('--manual-progress', progress.toFixed(4));
};

const updateActive = (index: number) => {
	sectionMeta.forEach((meta, i) => {
		meta.item.classList.toggle('is-active', i === index);
	});
};

const getSectionLabel = (section: HTMLElement, index: number) => {
	const explicit = section.dataset.motionLabel?.trim();
	if (explicit) return explicit;
	const heading = section.querySelector('h1, h2, h3');
	if (heading?.textContent?.trim()) return heading.textContent.trim();
	return `Section ${String(index + 1).padStart(2, '0')}`;
};

const makeId = (index: number) => `manual-section-${index + 1}`;

export const initManualScroller = () => {
	if (typeof window === 'undefined') return;
	const rail = document.getElementById('manual-scroller');
	const list = rail?.querySelector<HTMLOListElement>('[data-manual-sections]');
	if (!(rail instanceof HTMLElement) || !(list instanceof HTMLOListElement)) return;

	const sections = Array.from(
		document.querySelectorAll<HTMLElement>('[data-motion-chapter]')
	);

	if (sections.length < 2) {
		rail.hidden = true;
		return;
	}

	list.innerHTML = '';
	sectionMeta = sections.map((section, index) => {
		const id = section.id || makeId(index);
		section.id = id;
		const label = getSectionLabel(section, index);
		const item = document.createElement('a');
		item.href = `#${id}`;
		item.className = 'manual-scroller__item';
		item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${label}</strong>`;
		const li = document.createElement('li');
		li.appendChild(item);
		list.appendChild(li);
		return { el: section, id, item };
	});

	rail.hidden = false;

	const onScroll = () => {
		if (raf) return;
		raf = window.requestAnimationFrame(() => {
			raf = 0;
			updateProgress(rail);
		});
	};

	const reduced = prefersReducedMotion();
	if (reduced) {
		rail.classList.add('manual-scroller--reduced');
	} else {
		rail.classList.remove('manual-scroller--reduced');
	}

	updateProgress(rail);
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll);
	cleanupFns.push(() => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
	});

	if ('IntersectionObserver' in window) {
		observer = new IntersectionObserver(
			(entries) => {
				let bestIndex = -1;
				let bestRatio = 0;
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					const idx = sectionMeta.findIndex((meta) => meta.el === entry.target);
					if (idx < 0) return;
					if (entry.intersectionRatio >= bestRatio) {
						bestRatio = entry.intersectionRatio;
						bestIndex = idx;
					}
				});
				if (bestIndex >= 0) {
					updateActive(bestIndex);
				}
			},
			{ threshold: [0.2, 0.35, 0.5, 0.7], rootMargin: '-10% 0px -35% 0px' }
		);

		sectionMeta.forEach((meta) => observer?.observe(meta.el));
		cleanupFns.push(() => {
			observer?.disconnect();
			observer = null;
		});
	}

	updateActive(0);
};

export const cleanupManualScroller = () => {
	if (raf) {
		window.cancelAnimationFrame(raf);
		raf = 0;
	}
	cleanupFns.forEach((fn) => fn());
	cleanupFns = [];
	observer?.disconnect();
	observer = null;
	sectionMeta = [];
};
