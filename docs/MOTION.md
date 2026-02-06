# Motion

## Lottie

Use the `Lottie` component for JSON-based motion clips. Files live under `public/lottie/`.

```astro
---
import Lottie from '../components/interactive/Lottie.astro';
---

<Lottie src="/lottie/example.json" class="w-32 h-32" ariaLabel="Pulsing circle" />
```

## Rive

Use `RivePlayer` for `.riv` assets under `public/rive/`.

```astro
---
import RivePlayer from '../components/interactive/RivePlayer.astro';
---

<RivePlayer
	src="/rive/ui/button.riv"
	mode="play-when-visible"
	ariaLabel="Rive demo"
/>
```

State-machine inputs + interactions:

```astro
<RivePlayer
	src="/rive/ui/button.riv"
	stateMachine="Button"
	inputs={{ isHover: false, progress: 0 }}
	interactions={[
		{ event: 'hover', action: 'boolean', input: 'isHover' },
		{ event: 'click', action: 'trigger', input: 'burst' },
		{ event: 'scroll', action: 'number', input: 'progress', min: 0, max: 1 },
	]}
	debug={true}
/>
```

`Rive.astro` remains as a compatibility wrapper around `RivePlayer`.

## Recipes

Rive behavior recipes live in `src/content/rive-recipes.ts` and can be referenced from `ArtSlot` via `slot.riveRecipe`.

For full runtime patterns, controls, and pipeline guidance see `docs/RIVE_SKILLS.md`.
