# Art Slot Configuration

## Editable Parameters
- HERO_ART_ENABLED: `true`
- HERO_ART_SRC: `/art/hero/hero-piece.png`
- TOOL_ART:
  - colorwizard: `/art/tools/colorwizard.png`
  - magpie: `/art/tools/magpie.png`
- MOTION_SLOT:
  - type: `rive`
  - src: `/rive/ui/button.riv`
  - fallbackSrc: `/art/motion/motion-poster.png`

## Overview
All art assignments live in `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/src/content/art-manifest.ts`.

Swap artwork by editing only the manifest and files in `public/`.

## Curation Mode
Top-level manifest field:
- `mode`: `'quiet' | 'gallery'` (default: `'quiet'`)

Behavior:
- `quiet`: hero and motion respect their own `enabled` flags; tool thumbnails are considered off unless a tool slot explicitly has `enabled: true`.
- `gallery`: each slot is respected according to its own `enabled` flag.

Recommended usage:
- Use `quiet` as the default editorial mode for everyday updates.
- Switch to `gallery` only when you intentionally want multiple tool artworks visible at once.

## Folder Locations
- Hero art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/hero/`
- Tool card art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/tools/`
- Motion poster art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/motion/`
- Motion Rive files: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/rive/`

## Slot Fields
Each slot supports:
- `mode` (top-level manifest): `'quiet' | 'gallery'`
- `enabled`: `true | false`
- `type`: `'image' | 'video' | 'rive'`
- `src`: primary asset path in `/public`
- `fallbackSrc` (optional): backup asset path in `/public`
- `riveRecipe` (optional): key from `src/content/rive-recipes.ts` for shared interaction/runtime behavior
- `alt`: required accessible description
- `caption` (optional): copy for caption line
- `showCaption` (optional): show caption only when `true` and caption exists; default is `false`
- `aspect` (optional): ratio string like `1:1`, `4:3`, `16:9`
- `fit` (optional): `'cover' | 'contain'`; default is `'cover'`
- `position` (optional): CSS object-position string; default is `'50% 50%'`
- `surface` (optional): `'none' | 'paper' | 'ink'`; default is `'none'`
- `priority` (optional): eager-load important media
- `treatment` (optional): `'flat' | 'matted' | 'float'`
- `animate` (optional): `false` disables reveal animation for that slot
- `reveal` (optional): `'none' | 'fade' | 'wipe'`
- `link` (optional): `{ href: string; label?: string }` rendered as a quiet underline link under the plate
  - external links (`http...`) automatically receive `target="_blank"` and `rel="noopener noreferrer"`

## Motion Slot Behavior
Use one `motion` slot with optional `fallbackSrc`.

Behavior order:
1. If `prefers-reduced-motion: reduce`, render `fallbackSrc` immediately when available.
2. Otherwise for `type: 'rive'`, try loading the Rive file from `src`.
3. If Rive init fails or the asset is unavailable, render `fallbackSrc`.
4. If neither media exists, render the quiet placeholder motif.

## Aspect Ratio Stability
Set `aspect` for every slot to prevent layout shift.

Implementation details:
- Primary path uses CSS `aspect-ratio`.
- Browsers without `aspect-ratio` use a `padding-top` fallback.
- Media remains fully responsive (`width: 100%`, `height: 100%`) inside the ratio container.

## Curation Rules
- Use one strong hero piece and keep supporting slots quieter.
- Keep tool thumbnails tonally consistent (same crop logic and similar contrast).
- Prefer `contain` only when edge content is important; otherwise use `cover`.
- Keep captions rare; turn them on only when context is necessary.
- Add links only when the destination adds meaning (case study, full motion, credits).

## Scarcity Rules
- Keep at least one major slot intentionally empty on each pass.
- Change only one primary artwork per update cycle.
- Avoid enabling captions and links on every slot at once.
- Reserve `surface: 'ink'` for a single high-emphasis slot at a time.

## Updated Manifest Example
```ts
export const artManifest = {
  mode: 'quiet',
  hero: {
    enabled: true,
    type: 'image',
    src: '/art/hero/hero-piece.png',
    alt: 'Featured artwork',
    caption: 'Artwork slot',
    showCaption: true,
    aspect: '16:9',
    fit: 'cover',
    position: '50% 50%',
    surface: 'paper',
    priority: true,
    treatment: 'matted',
    animate: true,
    reveal: 'fade',
    link: {
      href: '/portfolio',
      label: 'View details',
    },
  },
  tools: {
    colorwizard: {
      enabled: true,
      type: 'image',
      src: '/art/tools/colorwizard.png',
      alt: 'ColorWizard artwork',
      aspect: '4:3',
      fit: 'cover',
      position: '50% 50%',
      surface: 'none',
      treatment: 'flat',
      animate: true,
      reveal: 'fade',
    },
    magpie: {
      enabled: true,
      type: 'image',
      src: '/art/tools/magpie.png',
      alt: 'Magpie artwork',
      aspect: '4:3',
      fit: 'cover',
      position: '50% 50%',
      surface: 'none',
      treatment: 'flat',
      animate: true,
      reveal: 'fade',
    },
  },
  motion: {
    enabled: true,
    type: 'rive',
    src: '/rive/ui/button.riv',
    fallbackSrc: '/art/motion/motion-poster.png',
    riveRecipe: 'motionSpecimen',
    alt: 'Motion slot',
    caption: 'Motion slot',
    showCaption: true,
    aspect: '16:9',
    fit: 'cover',
    position: '50% 50%',
    surface: 'ink',
    treatment: 'float',
    animate: true,
    reveal: 'wipe',
  },
};
```
