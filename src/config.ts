export const site = {
	title: 'Colton Batts',
	description: 'Toolmaker. Building offline-first tools.',
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

export const navItems = [
	{ href: '/', label: 'Home' },
	{ href: '/tools', label: 'Tools' },
	{ href: '/portfolio', label: 'Portfolio' },
	{ href: '/now', label: 'Now' },
	{ href: '/contact', label: 'Contact' },
];
