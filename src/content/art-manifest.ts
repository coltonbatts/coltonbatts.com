export type ArtType = 'image' | 'video' | 'rive';
export type ArtTreatment = 'flat' | 'matted' | 'float';
export type ArtReveal = 'none' | 'fade' | 'wipe';
export type ArtFit = 'cover' | 'contain';
export type ArtSurface = 'none' | 'paper' | 'ink';
export type ArtManifestMode = 'quiet' | 'gallery';

export interface ArtLinkConfig {
	href: string;
	label?: string;
}

export interface ArtSlotConfig {
	enabled: boolean;
	type: ArtType;
	src: string;
	fallbackSrc?: string;
	riveRecipe?: string;
	alt: string;
	caption?: string;
	showCaption?: boolean;
	aspect?: `${number}:${number}`;
	fit?: ArtFit;
	position?: string;
	surface?: ArtSurface;
	priority?: boolean;
	treatment?: ArtTreatment;
	animate?: boolean;
	reveal?: ArtReveal;
	link?: ArtLinkConfig;
}

export interface ArtManifest {
	mode: ArtManifestMode;
	hero: ArtSlotConfig;
	tools: Record<string, ArtSlotConfig>;
	motion: ArtSlotConfig;
}

export const artManifest: ArtManifest = {
	mode: 'quiet',
	hero: {
		enabled: true,
		type: 'image',
		src: '/art/hero/hero-01.png',
		alt: 'Surreal night street scene artwork',
		caption: 'procession · Colton Batts 2026',
		showCaption: true,
		aspect: '16:9',
		fit: 'cover',
		position: '50% 50%',
		surface: 'paper',
		priority: true,
		treatment: 'matted',
		animate: true,
		reveal: 'fade',
		link: {
			href: '/portfolio',
			label: 'View details',
		},
	},
	tools: {
		colorwizard: {
			enabled: true,
			type: 'image',
			src: '/art/tools/colorwizard.png',
			alt: 'ColorWizard — spectral color mixing engine nameplate',
			aspect: '4:3',
			fit: 'cover',
			position: '50% 50%',
			surface: 'none',
			treatment: 'flat',
			animate: true,
			reveal: 'fade',
		},
		magpie: {
			enabled: true,
			type: 'image',
			src: '/art/tools/magpie.png',
			alt: 'MagpieApp — embroidery design suite nameplate',
			aspect: '4:3',
			fit: 'cover',
			position: '50% 50%',
			surface: 'none',
			treatment: 'flat',
			animate: true,
			reveal: 'fade',
		},
	},
	motion: {
		enabled: true,
		type: 'rive',
		src: '/rive/ui/button.riv',
		fallbackSrc: '/art/motion/motion-poster.png',
		riveRecipe: 'motionSpecimen',
		alt: 'Motion slot',
		caption: 'Motion slot',
		showCaption: true,
		aspect: '16:9',
		fit: 'cover',
		position: '50% 50%',
		surface: 'ink',
		treatment: 'float',
		animate: true,
		reveal: 'wipe',
	},
};
