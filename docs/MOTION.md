# Motion

## Current Runtime
Motion now runs through Motion OS:
- Global orchestration: `src/motion/orchestrator.ts`
- Embed primitive: `src/components/interactive/RivePlayer.astro`
- Recipe config: `src/content/rive-recipes.ts`

Deep docs:
- `docs/MOTION_OS.md`
- `docs/RIVE_RECIPES.md`

## Quick Usage

```astro
---
import RivePlayer from '../components/interactive/RivePlayer.astro';
import { resolveRiveRecipe } from '../content/rive-recipes';

const recipe = resolveRiveRecipe('homepageMotionHero');
---

<RivePlayer
  id="motion-demo"
  src="/rive/ui/button.riv"
  recipe={recipe}
>
  <img slot="fallback" src="/art/motion/motion-poster.png" alt="Motion poster" class="art-slot__media art-slot__rive-fallback" />
</RivePlayer>
```

## Migration Steps (Legacy)
1. Replace old direct config props with a recipe key in `src/content/rive-recipes.ts`.
2. Pass `recipe={resolveRiveRecipe('yourKey')}` into `RivePlayer` or `Rive`.
3. Move custom event logic into `signals` in the recipe.
4. Keep fallback poster slot for reduced-motion/static parity.
5. Validate with `npm run rive:lint && npm run build`.

## How To Add A New Rive In < 2 Minutes
1. Add `public/rive/<category>/<asset>.riv`.
2. Add recipe entry in `src/content/rive-recipes.ts`.
3. Embed with `RivePlayer` and fallback slot.
4. Run `npm run rive:lint` and `npm run build`.

## Lottie
Use `Lottie` for JSON clips under `public/lottie/`:

```astro
---
import Lottie from '../components/interactive/Lottie.astro';
---

<Lottie src="/lottie/example.json" class="w-32 h-32" ariaLabel="Pulsing circle" />
```
