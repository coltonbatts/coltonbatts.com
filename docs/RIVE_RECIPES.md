# Rive Recipes

## Schema
`MotionRecipe` lives in `src/motion/recipes.ts`.

```ts
export type MotionRecipe = {
  id: string;
  description?: string;
  artboard?: string;
  stateMachine?: string;
  autoplay?: boolean;
  mode?: 'play-when-visible' | 'always';
  inputs?: Record<string, boolean | number | string>;
  interactions?: RiveInteraction[];
  debug?: boolean;
  fallbackPoster?: string;
  respectReducedMotion?: boolean;
  signals?: Partial<Record<
    | 'hover'
    | 'click'
    | 'scroll-progress'
    | 'section-enter'
    | 'section-exit'
    | 'route-transition-start'
    | 'route-transition-end'
    | 'idle-start'
    | 'idle-end',
    MotionSignalAction[]
  >>;
};
```

## Signal Actions
- `set-boolean`
- `set-boolean-from-active`
- `set-number`
- `set-number-from-progress`
- `fire-trigger`
- `play`
- `pause`

## Examples

Homepage moment (`scroll + hover`):

```ts
homepageMotionHero: {
  id: 'homepage-motion-hero',
  stateMachine: 'Button',
  inputs: { isHover: false, progress: 0 },
  signals: {
    hover: [{ type: 'set-boolean-from-active', input: 'isHover' }],
    'scroll-progress': [{ type: 'set-number-from-progress', input: 'progress', min: 0, max: 100 }],
    'route-transition-start': [{ type: 'pause' }],
    'route-transition-end': [{ type: 'play' }],
  },
}
```

Lab preview wake/sleep:

```ts
labCardPreview: {
  id: 'lab-card-preview',
  autoplay: false,
  mode: 'play-when-visible',
  interactions: [{ event: 'hover', action: 'play-pause' }],
  signals: {
    'section-enter': [{ type: 'play' }],
    'section-exit': [{ type: 'pause' }],
    'idle-start': [{ type: 'pause' }],
  },
}
```

## Migration (Old `RiveRecipe` -> `MotionRecipe`)
1. Keep existing `artboard`, `stateMachine`, `inputs`, `interactions`.
2. Add `id`.
3. Move behavior into `signals` (instead of one-off page scripts).
4. Pass recipe into `<RivePlayer recipe={recipe} />`.

## Copy/Paste Add Flow
```astro
---
import RivePlayer from '../components/interactive/RivePlayer.astro';
import { resolveRiveRecipe } from '../content/rive-recipes';

const recipe = resolveRiveRecipe('homepageMotionHero');
---

<RivePlayer
  id="example-player"
  src="/rive/ui/button.riv"
  recipe={recipe}
/>
```
