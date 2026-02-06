import type { RiveInputs, RiveInteraction, RiveMode } from '../animations/rive';

export type MotionSignalName =
	| 'hover'
	| 'click'
	| 'scroll-progress'
	| 'section-enter'
	| 'section-exit'
	| 'route-transition-start'
	| 'route-transition-end'
	| 'idle-start'
	| 'idle-end';

export type MotionSignal = {
	type: MotionSignalName;
	active?: boolean;
	progress?: number;
	sectionId?: string;
	timestamp: number;
};

export type MotionSignalAction =
	| {
			type: 'set-boolean';
			input: string;
			value: boolean;
	  }
	| {
			type: 'set-boolean-from-active';
			input: string;
			invert?: boolean;
	  }
	| {
			type: 'set-number';
			input: string;
			value: number;
	  }
	| {
			type: 'set-number-from-progress';
			input: string;
			min?: number;
			max?: number;
	  }
	| {
			type: 'fire-trigger';
			input: string;
	  }
	| {
			type: 'play';
	  }
	| {
			type: 'pause';
	  };

export type MotionRecipe = {
	id: string;
	description?: string;
	artboard?: string;
	stateMachine?: string;
	autoplay?: boolean;
	mode?: RiveMode;
	inputs?: RiveInputs;
	interactions?: RiveInteraction[];
	debug?: boolean;
	fallbackPoster?: string;
	respectReducedMotion?: boolean;
	signals?: Partial<Record<MotionSignalName, MotionSignalAction[]>>;
};

export const timeline = (progress: number, min = 0, max = 1) => {
	const clamped = Math.max(0, Math.min(1, progress));
	return min + (max - min) * clamped;
};
