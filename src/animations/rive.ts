import { applyMotionAction, type InputBridgeTarget } from '../motion/input-bridge';
import { getRiveOrchestrator } from '../motion/orchestrator';
import type { MotionRecipe, MotionSignal, MotionSignalAction } from '../motion/recipes';

type RiveModule = typeof import('@rive-app/canvas');
type RiveInstance = import('@rive-app/canvas').Rive;
type RiveInput = import('@rive-app/canvas').StateMachineInput;

export type RiveInputValue = boolean | number | string;
export type RiveInputs = Record<string, RiveInputValue>;
export type RiveMode = 'play-when-visible' | 'always';

export type RiveInteraction =
	| {
			event: 'hover';
			action: 'play-pause';
	  }
	| {
			event: 'hover';
			action: 'boolean';
			input: string;
			enter?: boolean;
			leave?: boolean;
	  }
	| {
			event: 'click';
			action: 'trigger';
			input: string;
	  }
	| {
			event: 'scroll';
			action: 'number';
			input: string;
			min?: number;
			max?: number;
	  };

type RiveInitOptions = {
	src?: string;
	artboard?: string;
	stateMachine?: string;
	autoplay?: boolean;
	mode?: RiveMode;
	inputs?: RiveInputs;
	interactions?: RiveInteraction[];
	debug?: boolean;
	respectReducedMotion?: boolean;
	recipe?: MotionRecipe;
	id?: string;
};

type RiveManagedInstance = {
	id: string;
	rive: RiveInstance;
	canvas: HTMLCanvasElement;
	container: HTMLElement;
	stateMachine?: string;
	inputsByName: Map<string, RiveInput>;
	interactions: RiveInteraction[];
	isVisible: boolean;
	isPageVisible: boolean;
	isHovered: boolean;
	autoplay: boolean;
	mode: RiveMode;
	cleanupFns: Array<() => void>;
	debug: boolean;
	debugPanel: HTMLElement | null;
	recipe?: MotionRecipe;
};

type RiveCleanup = () => void;

const instances = new Map<HTMLElement, RiveCleanup>();
const managedInstances = new Map<HTMLElement, RiveManagedInstance>();
let idCounter = 0;

export const prefersReducedMotion = () => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const parseBoolean = (value: string | null, fallback: boolean) => {
	if (value === null) return fallback;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return fallback;
};

const parseInputs = (value: string | null): RiveInputs | undefined => {
	if (!value) return undefined;
	try {
		const parsed = JSON.parse(value);
		if (!parsed || typeof parsed !== 'object') return undefined;
		return parsed as RiveInputs;
	} catch {
		return undefined;
	}
};

const parseInteractions = (value: string | null): RiveInteraction[] => {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed as RiveInteraction[];
	} catch {
		return [];
	}
};

const parseRecipe = (value: string | null): MotionRecipe | undefined => {
	if (!value) return undefined;
	try {
		return JSON.parse(value) as MotionRecipe;
	} catch {
		return undefined;
	}
};

const loadRive = (() => {
	let cached: Promise<RiveModule> | null = null;
	return () => {
		if (!cached) {
			cached = import('@rive-app/canvas');
		}
		return cached;
	};
})();

const warn = (container: HTMLElement, message: string) => {
	const src = container.dataset.riveSrc ?? 'unknown-src';
	console.warn(`[RivePlayer] ${message} (${src})`);
};

const refreshInputMap = (instance: RiveManagedInstance) => {
	instance.inputsByName.clear();
	if (!instance.stateMachine) return;
	const machineInputs = instance.rive.stateMachineInputs(instance.stateMachine) ?? [];
	machineInputs.forEach((input) => {
		instance.inputsByName.set(input.name, input);
	});
};

const updateDebugPanel = (instance: RiveManagedInstance) => {
	if (!instance.debug || !instance.debugPanel) return;
	const names = Array.from(instance.inputsByName.keys());
	const lines = [
		`id: ${instance.id}`,
		`stateMachine: ${instance.stateMachine ?? 'none'}`,
		`inputs: ${names.length ? names.join(', ') : 'none'}`,
		`recipe: ${instance.recipe?.id ?? 'none'}`,
	];
	instance.debugPanel.textContent = lines.join('\n');
};

const setRenderActive = (instance: RiveManagedInstance, active: boolean) => {
	if (active) {
		if (typeof instance.rive.startRendering === 'function') {
			instance.rive.startRendering();
		}
		instance.rive.play();
		return;
	}

	instance.rive.pause();
	if (typeof instance.rive.stopRendering === 'function') {
		instance.rive.stopRendering();
	}
};

const syncPlayback = (instance: RiveManagedInstance) => {
	if (!instance.autoplay) {
		if (instance.interactions.some((interaction) => interaction.action === 'play-pause')) {
			setRenderActive(instance, instance.isHovered && instance.isPageVisible);
			return;
		}
		setRenderActive(instance, false);
		return;
	}

	const shouldRun = instance.mode === 'always' ? instance.isPageVisible : instance.isVisible && instance.isPageVisible;

	setRenderActive(instance, shouldRun);
};

const applyInputValue = (
	instance: RiveManagedInstance,
	inputName: string,
	value: RiveInputValue
) => {
	const targetInput = instance.inputsByName.get(inputName);
	if (!targetInput) {
		warn(instance.container, `Input "${inputName}" was not found on state machine`);
		return;
	}

	if (typeof value === 'boolean' || typeof value === 'number') {
		targetInput.value = value;
		updateDebugPanel(instance);
		return;
	}

	if (value === 'fire' || value === 'trigger') {
		if (typeof targetInput.fire === 'function') {
			targetInput.fire();
			return;
		}
		warn(instance.container, `Input "${inputName}" is not trigger-compatible`);
		return;
	}

	if (value === 'true' || value === 'false') {
		targetInput.value = value === 'true';
		updateDebugPanel(instance);
		return;
	}

	const numeric = Number(value);
	if (!Number.isNaN(numeric)) {
		targetInput.value = numeric;
		updateDebugPanel(instance);
	}
};

const applyInputs = (instance: RiveManagedInstance, inputs: RiveInputs | undefined) => {
	if (!inputs) return;
	Object.entries(inputs).forEach(([name, value]) => {
		applyInputValue(instance, name, value);
	});
};

const applySignalActions = (
	instance: RiveManagedInstance,
	signal: MotionSignal,
	actions: MotionSignalAction[] | undefined
) => {
	if (!actions || !actions.length) return;
	const bridge: InputBridgeTarget = {
		setBoolean: (inputName, value) => applyInputValue(instance, inputName, value),
		setNumber: (inputName, value) => applyInputValue(instance, inputName, value),
		fireTrigger: (inputName) => applyInputValue(instance, inputName, 'fire'),
		play: () => setRenderActive(instance, true),
		pause: () => setRenderActive(instance, false),
	};
	actions.forEach((action) => {
		applyMotionAction(bridge, action, signal);
	});
};

const applyRecipeSignal = (instance: RiveManagedInstance, signal: MotionSignal) => {
	const signals = instance.recipe?.signals;
	if (!signals) return;
	applySignalActions(instance, signal, signals[signal.type]);
};

const bindInteractions = (instance: RiveManagedInstance) => {
	const { container, interactions } = instance;
	if (!interactions.length) return;

	interactions.forEach((interaction) => {
		if (interaction.event === 'hover') {
			const onEnter = () => {
				instance.isHovered = true;
				applyRecipeSignal(instance, {
					type: 'hover',
					active: true,
					timestamp: Date.now(),
				});
				if (interaction.action === 'play-pause') {
					syncPlayback(instance);
					return;
				}
				if (interaction.action === 'boolean') {
					applyInputValue(instance, interaction.input, interaction.enter ?? true);
				}
			};

			const onLeave = () => {
				instance.isHovered = false;
				applyRecipeSignal(instance, {
					type: 'hover',
					active: false,
					timestamp: Date.now(),
				});
				if (interaction.action === 'play-pause') {
					syncPlayback(instance);
					return;
				}
				if (interaction.action === 'boolean') {
					applyInputValue(instance, interaction.input, interaction.leave ?? false);
				}
			};

			container.addEventListener('mouseenter', onEnter);
			container.addEventListener('mouseleave', onLeave);
			instance.cleanupFns.push(() => {
				container.removeEventListener('mouseenter', onEnter);
				container.removeEventListener('mouseleave', onLeave);
			});
			return;
		}

		if (interaction.event === 'click' && interaction.action === 'trigger') {
			const onClick = () => {
				applyInputValue(instance, interaction.input, 'fire');
				applyRecipeSignal(instance, {
					type: 'click',
					active: true,
					timestamp: Date.now(),
				});
			};
			container.addEventListener('click', onClick);
			instance.cleanupFns.push(() => container.removeEventListener('click', onClick));
			return;
		}

		if (interaction.event === 'scroll' && interaction.action === 'number') {
			const min = interaction.min ?? 0;
			const max = interaction.max ?? 1;
			let ticking = false;

			const updateOnScroll = () => {
				if (ticking) return;
				ticking = true;
				window.requestAnimationFrame(() => {
					const rect = container.getBoundingClientRect();
					const viewport = Math.max(window.innerHeight, 1);
					const total = rect.height + viewport;
					const progress = Math.min(1, Math.max(0, (viewport - rect.top) / Math.max(total, 1)));
					const mapped = min + progress * (max - min);
					applyInputValue(instance, interaction.input, mapped);
					applyRecipeSignal(instance, {
						type: 'scroll-progress',
						progress,
						timestamp: Date.now(),
					});
					ticking = false;
				});
			};

			window.addEventListener('scroll', updateOnScroll, { passive: true });
			window.addEventListener('resize', updateOnScroll);
			updateOnScroll();
			instance.cleanupFns.push(() => {
				window.removeEventListener('scroll', updateOnScroll);
				window.removeEventListener('resize', updateOnScroll);
			});
		}
	});
};

const getManagedInstance = (container: HTMLElement) => managedInstances.get(container);

export const setRiveBoolean = (container: HTMLElement, inputName: string, value: boolean) => {
	const instance = getManagedInstance(container);
	if (!instance) return;
	applyInputValue(instance, inputName, value);
};

export const setRiveNumber = (container: HTMLElement, inputName: string, value: number) => {
	const instance = getManagedInstance(container);
	if (!instance) return;
	applyInputValue(instance, inputName, value);
};

export const fireRiveTrigger = (container: HTMLElement, inputName: string) => {
	const instance = getManagedInstance(container);
	if (!instance) return;
	applyInputValue(instance, inputName, 'fire');
};

const preflightAsset = (container: HTMLElement, src: string) => {
	if (!import.meta.env.DEV) return;
	if (!src.startsWith('/')) return;
	void fetch(src, { method: 'HEAD' })
		.then((response) => {
			if (!response.ok) {
				warn(container, `Asset preflight failed with HTTP ${response.status}`);
			}
		})
		.catch(() => {
			warn(container, 'Asset preflight failed. Check path or static output.');
		});
};

export const initRiveCanvas = async (container: HTMLElement, options: RiveInitOptions = {}) => {
	if (typeof window === 'undefined') return;
	if (instances.has(container) || container.dataset.riveInit === 'true') return;

	const src = options.src ?? container.dataset.riveSrc;
	if (!src) {
		warn(container, 'Missing required src');
		return;
	}

	container.dataset.riveInit = 'true';
	container.dataset.motionManaged = 'true';

	const parsedRecipe = options.recipe ?? parseRecipe(container.dataset.riveRecipe);
	const artboard = options.artboard ?? parsedRecipe?.artboard ?? container.dataset.riveArtboard ?? undefined;
	const stateMachine =
		options.stateMachine ?? parsedRecipe?.stateMachine ?? container.dataset.riveStateMachine ?? undefined;
	const autoplay = options.autoplay ?? parsedRecipe?.autoplay ?? parseBoolean(container.dataset.riveAutoplay, true);
	const mode = options.mode ?? parsedRecipe?.mode ?? ((container.dataset.riveMode as RiveMode | undefined) ?? 'play-when-visible');
	const inputs = options.inputs ?? parsedRecipe?.inputs ?? parseInputs(container.dataset.riveInputs);
	const interactions = options.interactions ?? parsedRecipe?.interactions ?? parseInteractions(container.dataset.riveInteractions);
	const debug = options.debug ?? parsedRecipe?.debug ?? parseBoolean(container.dataset.riveDebug, false);
	const respectReducedMotion =
		options.respectReducedMotion ??
		parsedRecipe?.respectReducedMotion ??
		parseBoolean(container.dataset.riveRespectReducedMotion, true);

	if (respectReducedMotion && prefersReducedMotion()) {
		container.classList.add('rive-player--reduced');
		container.classList.add('art-slot__rive--reduced');
		container.classList.remove('rive-player--loaded');
		container.classList.remove('art-slot__rive--loaded');
		container.dataset.riveInit = 'false';
		return;
	}

	preflightAsset(container, src);

	const { Rive } = await loadRive();

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.className = 'rive-player__canvas art-slot__rive-canvas';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.display = 'block';
	container.appendChild(canvas);

	let observer: IntersectionObserver | null = null;
	let resizeObserver: ResizeObserver | null = null;

	const id = options.id ?? container.dataset.riveId ?? `rive-${++idCounter}`;
	container.dataset.riveId = id;

	const managed: RiveManagedInstance = {
		id,
		rive: null as unknown as RiveInstance,
		canvas,
		container,
		stateMachine,
		inputsByName: new Map(),
		interactions,
		isVisible: mode === 'always',
		isPageVisible: document.visibilityState !== 'hidden',
		isHovered: false,
		autoplay,
		mode,
		cleanupFns: [],
		debug,
		debugPanel: container.querySelector<HTMLElement>('[data-rive-debug-panel]'),
		recipe: parsedRecipe,
	};

	const orchestrator = getRiveOrchestrator();

	const rive = new Rive({
		src,
		canvas,
		autoplay: false,
		artboard,
		stateMachines: stateMachine,
		onLoad: () => {
			managed.rive.resizeDrawingSurfaceToCanvas();
			container.classList.add('rive-player--loaded');
			container.classList.add('art-slot__rive--loaded');

			if (typeof ResizeObserver !== 'undefined') {
				resizeObserver = new ResizeObserver(() => {
					managed.rive.resizeDrawingSurfaceToCanvas();
				});
				resizeObserver.observe(container);
				managed.cleanupFns.push(() => resizeObserver?.disconnect());
			}

			if (mode === 'play-when-visible') {
				if ('IntersectionObserver' in window) {
					observer = new IntersectionObserver(
						(entries) => {
							entries.forEach((entry) => {
								managed.isVisible = entry.isIntersecting;
								syncPlayback(managed);
							});
						},
						{ threshold: 0.2 }
					);
					observer.observe(container);
					managed.cleanupFns.push(() => observer?.disconnect());
				} else {
					managed.isVisible = true;
				}
			}

			const onVisibilityChange = () => {
				managed.isPageVisible = document.visibilityState !== 'hidden';
				syncPlayback(managed);
			};
			document.addEventListener('visibilitychange', onVisibilityChange);
			managed.cleanupFns.push(() => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
			});

			if (artboard && !managed.rive.artboard) {
				warn(container, `Artboard "${artboard}" was not found`);
			}

			refreshInputMap(managed);
			if (stateMachine && managed.inputsByName.size === 0) {
				warn(container, `State machine "${stateMachine}" has no available inputs`);
			}
			applyInputs(managed, inputs);
			bindInteractions(managed);

			orchestrator.registerPlayer({
				id,
				container,
				stateMachine,
				getInputNames: () => Array.from(managed.inputsByName.keys()),
				onSignal: (signal) => {
					applyRecipeSignal(managed, signal);
				},
			});
			managed.cleanupFns.push(() => orchestrator.unregisterPlayer(id));

			updateDebugPanel(managed);
			syncPlayback(managed);
		},
		onLoadError: () => {
			warn(container, 'Failed to load Rive file');
			container.classList.add('rive-player--fallback');
			container.classList.add('art-slot__rive--fallback');
		},
	});

	managed.rive = rive;
	managedInstances.set(container, managed);

	const cleanup = () => {
		managed.cleanupFns.forEach((fn) => {
			fn();
		});
		managed.cleanupFns = [];
		observer?.disconnect();
		observer = null;
		resizeObserver?.disconnect();
		resizeObserver = null;
		managed.rive.cleanup();
		managedInstances.delete(container);
		if (container.contains(canvas)) {
			container.removeChild(canvas);
		}
		container.classList.remove('rive-player--loaded');
		container.classList.remove('art-slot__rive--loaded');
		container.dataset.riveInit = 'false';
		instances.delete(container);
	};

	instances.set(container, cleanup);
};

export const cleanupRiveCanvas = (container: HTMLElement) => {
	const cleanup = instances.get(container);
	if (cleanup) cleanup();
};

export const initRives = (root: ParentNode = document) => {
	if (typeof window === 'undefined') return;
	const containers = Array.from(root.querySelectorAll<HTMLElement>('[data-rive-player]'));
	if (!containers.length) return;
	containers.forEach((container) => {
		void initRiveCanvas(container);
	});
};

export const cleanupRives = () => {
	instances.forEach((cleanup) => cleanup());
	instances.clear();
	managedInstances.clear();
};
