export const site = {
	title: 'Colton Batts',
	description:
		'Film, motion, and design systems with a point of view — Fort Worth.',
	url: 'https://coltonbatts.com',
};

export const reel = {
	/** True to show the reel hero. Flip to true once the MP4 is in public/reel/ */
	enabled: false,
	/** Path to the reel video in public/. Supports mp4 and webm. */
	path: '/reel/colton-batts-reel.mp4',
	/** Optional poster image shown while video loads. */
	poster: '/reel/colton-batts-reel-poster.jpg',
	/** Label shown above the reel title in the overlay. */
	label: '2026 Reel',
	/** Optional title overlay. Leave empty to hide. */
	title: 'Colton Batts — Reel',
};

/** Hire path first. Work outranks Tools. */
export const navItems = [
	{ href: '/', label: 'Home' },
	{ href: '/portfolio', label: 'Work' },
	{ href: '/tools', label: 'Tools' },
	{ href: '/now', label: 'Now' },
	{ href: '/contact', label: 'Contact' },
];
