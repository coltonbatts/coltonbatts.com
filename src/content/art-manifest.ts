export type ArtType = 'image' | 'video' | 'rive';

export interface ArtSlotConfig {
	enabled: boolean;
	type: ArtType;
	src: string;
	alt: string;
	caption?: string;
	aspect?: `${number}:${number}`;
	priority?: boolean;
	poster?: string;
}

export interface ArtManifest {
	hero: ArtSlotConfig;
	tools: Record<string, ArtSlotConfig>;
	motion: {
		rive: ArtSlotConfig;
		poster: ArtSlotConfig;
	};
}

export const artManifest: ArtManifest = {
	hero: {
		enabled: true,
		type: 'image',
		src: '/art/hero/hero-piece.png',
		alt: 'Featured artwork',
		caption: 'Artwork slot',
		aspect: '16:9',
		priority: true,
	},
	tools: {
		colorwizard: {
			enabled: true,
			type: 'image',
			src: '/art/tools/colorwizard.png',
			alt: 'ColorWizard artwork',
			aspect: '4:3',
		},
		magpie: {
			enabled: true,
			type: 'image',
			src: '/art/tools/magpie.png',
			alt: 'Magpie artwork',
			aspect: '4:3',
		},
	},
	motion: {
		rive: {
			enabled: true,
			type: 'rive',
			src: '/rive/demo.riv',
			alt: 'Motion slot',
			caption: 'Motion slot',
			aspect: '16:9',
		},
		poster: {
			enabled: true,
			type: 'image',
			src: '/art/motion/motion-poster.png',
			alt: 'Motion poster',
			caption: 'Motion slot',
			aspect: '16:9',
		},
	},
};
