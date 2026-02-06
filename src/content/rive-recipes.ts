import type { MotionRecipe } from '../motion/recipes';

export const riveRecipes: Record<string, MotionRecipe> = {
	homepageMotionHero: {
		id: 'homepage-motion-hero',
		description: 'Homepage motion specimen driven by scroll depth and hover intent.',
		stateMachine: 'Button',
		autoplay: true,
		mode: 'play-when-visible',
		inputs: {
			isHover: false,
			progress: 0,
		},
		interactions: [
			{
				event: 'hover',
				action: 'boolean',
				input: 'isHover',
				enter: true,
				leave: false,
			},
			{
				event: 'click',
				action: 'trigger',
				input: 'burst',
			},
		],
		signals: {
			hover: [
				{ type: 'set-boolean-from-active', input: 'isHover' },
			],
			'section-enter': [{ type: 'fire-trigger', input: 'burst' }],
			click: [{ type: 'fire-trigger', input: 'burst' }],
			'scroll-progress': [
				{ type: 'set-number-from-progress', input: 'progress', min: 0, max: 100 },
			],
			'route-transition-start': [{ type: 'pause' }],
			'route-transition-end': [{ type: 'play' }],
			'idle-start': [{ type: 'pause' }],
			'idle-end': [{ type: 'play' }],
		},
	},
	labCardPreview: {
		id: 'lab-card-preview',
		description: 'Contextual previews that wake on focus/hover and sleep offscreen/idle.',
		autoplay: false,
		mode: 'play-when-visible',
		interactions: [
			{ event: 'hover', action: 'play-pause' },
		],
		signals: {
			'section-enter': [{ type: 'play' }],
			'section-exit': [{ type: 'pause' }],
			hover: [
				{ type: 'play' },
			],
			'idle-start': [{ type: 'pause' }],
			'route-transition-start': [{ type: 'pause' }],
		},
	},
	routePunctuation: {
		id: 'route-punctuation',
		description: 'Short punctuation burst used during Astro route transitions.',
		stateMachine: 'Button',
		autoplay: false,
		mode: 'always',
		signals: {
			'route-transition-start': [{ type: 'fire-trigger', input: 'burst' }],
			'route-transition-end': [{ type: 'fire-trigger', input: 'burst' }],
		},
	},
};

export const resolveRiveRecipe = (name: string | undefined): MotionRecipe | undefined => {
	if (!name) return undefined;
	return riveRecipes[name];
};
