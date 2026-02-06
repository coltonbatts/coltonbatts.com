# Motion OS

## What It Is
Motion OS is the global runtime layer that coordinates all Rive motion instances across Astro routes.

Core pieces:
- `RiveOrchestrator` in `src/motion/orchestrator.ts`
- `RivePlayer` in `src/components/interactive/RivePlayer.astro`
- Input helpers in `src/motion/input-bridge.ts`
- Recipe definitions in `src/content/rive-recipes.ts`

## Mental Model
1. `RivePlayer` is the embed primitive.
2. A `MotionRecipe` describes behavior and fallbacks declaratively.
3. `initRiveCanvas()` bootstraps each player and registers it with `RiveOrchestrator`.
4. The orchestrator emits scene signals (`hover`, `scroll-progress`, `section-enter`, `route-transition-start`, `idle-start`, etc.).
5. Recipes map signals to input actions (`setBoolean`, `setNumber`, `fireTrigger`, `play`, `pause`).

## Lifecycle + Safety
- SSR-safe: all runtime code is gated to browser execution.
- Reduced motion: Rive canvas is skipped when `prefers-reduced-motion` is active unless explicitly overridden.
- Visibility controls:
  - Offscreen pause via `IntersectionObserver`
  - Hidden-tab pause via `visibilitychange`
  - Optional idle pause via orchestrator idle signals
- No layout shift: player containers keep fixed frame dimensions before/after canvas init.

## Route Transition Punctuation
`BaseLayout` wires route signals:
- `notifyRouteTransitionStart()` on `astro:before-swap` / `astro:before-preparation`
- `notifyRouteTransitionEnd()` on init/page-load

This drives:
- Global kinetic overlay (`#route-kinetic-punctuation`)
- Optional route punctuation Rive instance (`routePunctuation` recipe)

## Debug HUD
- Toggle button: `Motion HUD` (bottom-left)
- Keyboard toggle: `Shift + M`
- Shows:
  - active player count
  - fps-ish heartbeat
  - reduced-motion state
  - registered machines + input names

Dev-only summary logs every 10s:
- `[MotionOS] players=... visible=... heartbeat=...`

## How To Add A New Rive In < 2 Minutes
1. Put asset in `public/rive/<category>/<name>.riv`.
2. Add a recipe in `src/content/rive-recipes.ts`.
3. Render:

```astro
---
import RivePlayer from '../components/interactive/RivePlayer.astro';
import { resolveRiveRecipe } from '../content/rive-recipes';

const recipe = resolveRiveRecipe('yourRecipeKey');
---

<RivePlayer
  id="demo-your-name"
  src="/rive/category/name.riv"
  recipe={recipe}
>
  <img slot="fallback" src="/art/motion/motion-poster.png" alt="Motion fallback" class="art-slot__media art-slot__rive-fallback" />
</RivePlayer>
```

4. Run checks:
- `npm run rive:lint`
- `npm run build`
