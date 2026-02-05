# Art Slot Configuration

## Editable Parameters
- HERO_ART_ENABLED: `true`
- HERO_ART_SRC: `/art/hero/hero-piece.png`
- TOOL_ART:
  - colorwizard: `/art/tools/colorwizard.png`
  - magpie: `/art/tools/magpie.png`
- MOTION_SLOT:
  - rive: `/rive/demo.riv`
  - poster: `/art/motion/motion-poster.png`

## Overview
All art assignments live in `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/src/content/art-manifest.ts`.

You can swap artwork without touching component code:
1. Drop or replace files in `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/hero/`, `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/tools/`, or `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/motion/`.
2. Update slot paths or `enabled` flags in `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/src/content/art-manifest.ts`.

## Folder Locations
- Hero art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/hero/`
- Tool card art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/tools/`
- Motion poster art: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/art/motion/`
- Optional Rive file: `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/public/rive/`

## Naming Conventions
- Hero: `hero-piece.[png|jpg|webp|mp4]`
- Tool thumbnails: use each tool slug, e.g. `colorwizard.png`, `magpie.png`
- Motion poster: `motion-poster.[png|jpg|webp]`
- Rive: `demo.riv` (or any filename, as long as manifest matches)

## Turn Slots On Or Off
Each slot object supports `enabled: true | false`.

Examples:
- Disable hero art: set `artManifest.hero.enabled = false`
- Disable one tool thumbnail: set `artManifest.tools.magpie.enabled = false`
- Disable motion Rive and use poster: set `artManifest.motion.rive.enabled = false` and `artManifest.motion.poster.enabled = true`

## Add A New Slot Later
1. Add a new slot key in `/Users/coltonbatts/MAIN WEBSITE/lonely-limb/src/content/art-manifest.ts`.
2. Reference it where needed with `<ArtSlot slot={...} />`.
3. Keep `aspect` set so layout remains stable before media loads.

## Aspect Ratios For Stable Layout
Use `aspect` in `W:H` format, for example:
- `1:1` square thumbnails
- `4:3` editorial stills
- `16:9` hero or motion media

`ArtSlot` reserves space with `aspect-ratio`, so cards and sections do not jump when files load.
