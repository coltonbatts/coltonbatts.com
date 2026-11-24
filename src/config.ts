export const site = {
	title: 'Colton Batts',
	description:
		'Creative technologist, video editor, and motion designer in Fort Worth, TX — commercial film for Google, Nuuly, Under Armour & Kate Spade, plus shipped Rust, Metal & WebGL software.',
	url: 'https://coltonbatts.com',
	location: 'Fort Worth, TX',
	coordinates: '32.7555°N · 97.3308°W',
	email: 'colton.batts@gmail.com',
	github: 'https://github.com/coltonbatts',
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

/** Primary nav: commercial work, shipped software, visual archive, resume, contact. */
export const navItems = [
	{ href: '/portfolio', label: 'Work' },
	{ href: '/tools', label: 'Tools' },
	{ href: '/art', label: 'Art' },
	{ href: '/resume', label: 'Resume' },
	{ href: '/contact', label: 'Contact' },
];

/** The footer index also carries secondary pages. */
export const footerItems = [
	...navItems,
	{ href: '/now', label: 'Now' },
	{ href: '/lab', label: 'Lab' },
];
