export const site = {
	title: 'Colton Batts',
	description: 'Photographs and commercial film by Colton Batts, Fort Worth.',
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

/** Primary nav, in the order the site argues: images, film, tools, contact.
 *  The logo is the way home. */
export const navItems = [
	{ href: '/art', label: 'Art' },
	{ href: '/portfolio', label: 'Work' },
	{ href: '/tools', label: 'Tools' },
	{ href: '/contact', label: 'Contact' },
];

/** The footer index also carries the secondary pages. */
export const footerItems = [...navItems, { href: '/now', label: 'Now' }];
