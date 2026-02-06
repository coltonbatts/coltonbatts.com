import type { MotionSignal, MotionSignalAction } from './recipes';
import { timeline } from './recipes';

export interface InputBridgeTarget {
	setBoolean: (inputName: string, value: boolean) => void;
	setNumber: (inputName: string, value: number) => void;
	fireTrigger: (inputName: string) => void;
	play: () => void;
	pause: () => void;
}

export const setBoolean = (
	target: InputBridgeTarget,
	inputName: string,
	value: boolean
) => {
	target.setBoolean(inputName, value);
};

export const setNumber = (
	target: InputBridgeTarget,
	inputName: string,
	value: number
) => {
	target.setNumber(inputName, value);
};

export const fireTrigger = (target: InputBridgeTarget, inputName: string) => {
	target.fireTrigger(inputName);
};

export const applyMotionAction = (
	target: InputBridgeTarget,
	action: MotionSignalAction,
	signal: MotionSignal
) => {
	switch (action.type) {
		case 'set-boolean': {
			setBoolean(target, action.input, action.value);
			return;
		}
		case 'set-boolean-from-active': {
			const active = Boolean(signal.active);
			const value = action.invert ? !active : active;
			setBoolean(target, action.input, value);
			return;
		}
		case 'set-number': {
			setNumber(target, action.input, action.value);
			return;
		}
		case 'set-number-from-progress': {
			const mapped = timeline(signal.progress ?? 0, action.min ?? 0, action.max ?? 1);
			setNumber(target, action.input, mapped);
			return;
		}
		case 'fire-trigger': {
			fireTrigger(target, action.input);
			return;
		}
		case 'play': {
			target.play();
			return;
		}
		case 'pause': {
			target.pause();
			return;
		}
	}
};
