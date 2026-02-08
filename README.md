# Colton Batts — Toolmaker

The personal site and workshop manual of Colton Batts. Production-first Multimedia Designer and Software Toolmaker.

[coltonbatts.com](https://coltonbatts.com)

## Core Philosophy: Own-Forever Software

This site serves as a manifesto and storefront for tools that respect the user.
- **Offline-First:** No accounts, no cloud dependencies, no tracking.
- **Privacy by Design:** Your data stays on your machine.
- **Precision Aesthetic:** Built with the Geist Pixel design system—stark, high-contrast, and architectural.

## Stack

- **Framework:** [Astro 5](https://astro.build/)
- **Design:** Custom "Instrument" Design System via Tailwind CSS
- **Typography:** Geist Pixel (Square, Circle, Triangle, Grid, Line) & Geist Mono
- **Motion:** Motion OS (Custom Rive + Lottie orchestration engine)
- **Content:** Astro Content Collections (Markdown + Zod)

## Structure

- `/src/content/` - Content collections for Tools, Paintings (Portfolio), and Now timeline.
- `/src/motion/` - Motion OS orchestrator and input bridge.
- `/src/styles/global.css` - The 1,600+ line design system core.
- `/public/rive/` - Interactive Rive assets for the UI.

## Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Lint Rive assets
npm run rive:lint
```

## Deployment

Pushes to `main` are automatically built and deployed via Vercel.

---
_Built with precision._
