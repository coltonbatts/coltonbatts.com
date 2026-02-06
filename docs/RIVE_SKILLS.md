# Rive Skills Pack

## Runtime Approach (for this repo)

This site is Astro-first with zero React runtime islands for motion, so the best default is:

- Runtime: `@rive-app/canvas` (already installed)
- Rendering: Canvas/WebGL-backed runtime managed by Rive internals
- Loading: client-only dynamic import (`import('@rive-app/canvas')`) to stay SSR-safe
- WASM: handled by the official runtime package at load time

Why this is the right fit:

- Matches your existing Astro component architecture (`.astro` + client scripts).
- Avoids adding a React wrapper where React is not otherwise required.
- Supports state machines, inputs, and render-loop control with low integration friction.

Official references:

- [Rive Web runtimes docs](https://rive.app/docs/runtimes/web/web-js)
- [Rive state machines docs](https://rive.app/docs/editor/state-machine/state-machine)
- [Rive web runtime parameters](https://rive.app/docs/runtimes/web/rive-parameters)

## Skill Categories

### A) Embed Skills

#### `RivePlayer.astro`
What it does:
- SSR-safe Astro component for `.riv` playback.
- Supports fallback slot content (poster/placeholder).
- Supports artboard, state machine, initial inputs, debug mode.

How to use:

```astro
---
import RivePlayer from '../components/interactive/RivePlayer.astro';
---

<RivePlayer
  src="/rive/ui/button.riv"
  mode="play-when-visible"
  ariaLabel="Interactive button motion"
>
  <img slot="fallback" src="/art/motion/motion-poster.png" alt="Motion poster" class="art-slot__media art-slot__rive-fallback" />
</RivePlayer>
```

Why it matters:
- One obvious entry point for Rive in Astro.

### B) Control Skills

#### State machine helpers (`src/animations/rive.ts`)
What it does:
- `setRiveBoolean(container, input, value)`
- `setRiveNumber(container, input, value)`
- `fireRiveTrigger(container, input)`

How to use:

```ts
import { setRiveBoolean, setRiveNumber, fireRiveTrigger } from '../animations/rive';

const el = document.querySelector('[data-rive-player]') as HTMLElement;
setRiveBoolean(el, 'isHover', true);
setRiveNumber(el, 'progress', 0.5);
fireRiveTrigger(el, 'burst');
```

Why it matters:
- Standardized input manipulation across components.

#### Interaction mapping conventions
What it does:
- Declarative `interactions` array on component/recipe.
- Supported tonight:
  - hover -> play/pause
  - hover -> boolean input
  - click -> trigger input
  - scroll -> number input (progress mapped min/max)

How to use:

```ts
interactions: [
  { event: 'hover', action: 'play-pause' },
  { event: 'click', action: 'trigger', input: 'burst' },
  { event: 'scroll', action: 'number', input: 'progress', min: 0, max: 100 },
]
```

Why it matters:
- A single declarative pattern for interaction wiring.

### C) Performance Skills

#### Runtime lifecycle controls
What it does:
- Lazy runtime import.
- Pause/resume via `IntersectionObserver` (offscreen).
- Pause when tab hidden (`visibilitychange`).
- Respect `prefers-reduced-motion` by leaving fallback visible.
- Resize drawing surface on container resize.

Why it matters:
- Lower idle CPU/GPU usage and better UX for motion-sensitive users.

### D) Boutique Motion Skills

#### Recipe system (`src/content/rive-recipes.ts`)
What it does:
- Central config for interaction + playback defaults by recipe key.
- `ArtSlot` can reference `slot.riveRecipe` for repeatable behavior.

Example:

```ts
motionSpecimen: {
  autoplay: false,
  mode: 'always',
  interactions: [{ event: 'hover', action: 'play-pause' }],
}
```

Why it matters:
- Reusable behaviors without per-page script duplication.

Asset pipeline recommendation:
- Store assets under `public/rive/<category>/<name>.riv`
- Include optional sidecar metadata as `public/rive/<category>/<name>.json`
- Use kebab-case names and semantic folders (`ui/`, `hero/`, `icons/`)
- Keep posters under `public/art/motion/` with matching names where possible

### E) Debug Skills

#### Debug overlay + warnings
What it does:
- Optional debug panel (`debug={true}`) showing state machine + input names.
- Console warnings for missing input names, missing artboard, load failures.

How to use:

```astro
<RivePlayer src="/rive/ui/button.riv" debug={true} />
```

Why it matters:
- Faster state-machine integration and safer iteration.

## Implemented Tonight

1. `RivePlayer.astro` (Astro-first embed + SSR-safe init)
2. Unified runtime controls in `src/animations/rive.ts`
3. `ArtSlot` migration off CDN inline loader onto shared runtime
4. Recipe system (`src/content/rive-recipes.ts`) + motion section wiring

## Simple Embed vs Advanced Control

Simple embed:

```astro
<RivePlayer src="/rive/ui/button.riv" class="w-40 h-40" ariaLabel="Motion demo" />
```

Advanced control:

```astro
<RivePlayer
  src="/rive/ui/button.riv"
  stateMachine="Button"
  inputs={{ isHover: false, progress: 0 }}
  interactions={[
    { event: 'hover', action: 'boolean', input: 'isHover', enter: true, leave: false },
    { event: 'scroll', action: 'number', input: 'progress', min: 0, max: 1 },
    { event: 'click', action: 'trigger', input: 'burst' },
  ]}
  mode="play-when-visible"
  debug={true}
/>
```
