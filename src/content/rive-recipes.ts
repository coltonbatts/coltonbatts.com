import type { RiveInputs, RiveInteraction, RiveMode } from '../animations/rive';

export type RiveRecipe = {
	stateMachine?: string;
	artboard?: string;
	autoplay?: boolean;
	mode?: RiveMode;
	inputs?: RiveInputs;
	interactions?: RiveInteraction[];
	debug?: boolean;
};

export const riveRecipes: Record<string, RiveRecipe> = {
	motionSpecimen: {
		autoplay: false,
		mode: 'always',
		interactions: [
			{
				event: 'hover',
				action: 'play-pause',
			},
		],
	},
};

export const resolveRiveRecipe = (name: string | undefined): RiveRecipe | undefined => {
	if (!name) return undefined;
	return riveRecipes[name];
};
