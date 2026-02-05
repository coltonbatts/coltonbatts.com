---
name: MagpieApp
oneLiner: The Artisan's Blueprint for Modern Embroidery. Transform images into high-fidelity technical patterns for hand-embroidery.
status: active
platform: macOS / Windows / Linux
version: "0.9.0"
lastUpdated: "2025.02"
ownershipType: Own-Forever
repoUrl: https://github.com/coltonbatts/MagpieApp
techStack:
  - Tauri 2 + Rust Core
  - Rayon Parallel Processing
  - CIEDE2000 Color Science
  - Pixi.js / WebGL Renderer
  - Editorial Modernism UI
links:
  - label: GitHub
    url: https://github.com/coltonbatts/MagpieApp
bullets:
  - 5-stage structured workflow from fabric to export.
  - Kubelka-Munk–grade DMC thread matching via CIEDE2000.
  - Native Rust processing pipeline with rayon parallelism.
  - WebGL-accelerated region rendering via Pixi.js.
  - Artisan Blueprint PDF and SVG export with Thread Manifest.
  - 100% offline. No accounts, no cloud, no subscriptions.
hardware:
  minimum: "macOS 12 / Windows 10 / Linux (x86_64 or ARM), 8GB RAM"
  recommended: "Apple Silicon Mac or modern multi-core desktop, 16GB RAM"
  notes: "WebGL 2.0 required for the Pixi.js renderer. Pattern generation speed scales linearly with core count via rayon."
---

## Built for an Embroiderist

MagpieApp exists because my wife needed it. She's a hand-embroidery artist, and the tools available to her were either industrial digitizing software designed for machine embroidery or phone apps that produced unusable patterns. Nothing sat in the middle — professional-grade, designed for human hands, running on a desktop.

So I built it. MagpieApp is a professional embroidery design suite that transforms images into high-fidelity "Artisan Blueprints" — technical patterns designed specifically for modern hand-embroidery. Not machine instructions. Not cross-stitch grids. Real patterns for real thread on real fabric.

## The Assembly Line

MagpieApp follows a structured 5-stage workflow. Each stage has a single job. You move forward when the stage is complete. No modal dialogs, no hidden settings panels, no ambiguity about where you are in the process.

**1. Fabric Stage** — Define your canvas. Select your hoop size and fabric type to ground the project in physical dimensions. Everything downstream respects these constraints.

**2. Reference Stage** — Direct manipulation. Click and drag to position your reference image within the hoop. This is the foundation — precision alignment here means precision stitching later.

**3. Select Stage (The Mask)** — Artist-friendly masking with an intelligent Magic Wand tool. Select exactly which areas of your image should be stitched. Separate the subject from the background with surgical precision. This is where the artisan makes creative decisions the algorithm can't.

**4. Build Stage** — High-performance pattern generation. Your image is quantized into real DMC thread colors and organized into interactive regions. The interface is "paint-by-numbers" style — each region maps to a thread color, and the dynamic legend lets you highlight specific regions to understand the full palette. This is where the Rust backend earns its keep: rayon parallelism across every available core to process complex images in seconds.

**5. Export Stage** — Distribute the blueprint. Generate professional Artisan Blueprint PDFs and high-fidelity SVGs. Every export includes a Swiss-modernist style Thread Manifest — a clean, typographic document listing every DMC thread color, quantity estimate, and region map for project management.

## The Processing Pipeline

The pattern generation engine is not a web filter. It's a native Rust pipeline built for accuracy.

**Color Matching** — MagpieApp uses the CIEDE2000 color difference formula to match image pixels to the DMC thread catalog. CIEDE2000 is the current industry standard for perceptual color difference — it accounts for the non-uniformity of human color perception in ways that simple Euclidean distance in RGB or even LAB cannot. When the engine says "DMC 3799" is the closest match, it's the closest match your eyes would agree with.

**Region Detection** — The `regions.rs` module identifies contiguous areas of matched color and builds vector boundaries around them. This isn't pixel-grid output — it's clean, scalable region geometry that renders sharp at any zoom level.

**Parallel Processing** — The `embroidery.rs` core leverages rayon for data-parallel computation. Every pixel's color match, every region boundary calculation, every quantization pass runs across all available cores simultaneously. On an 8-core machine, you get 8 cores of work. The pipeline was designed from the start to never be single-threaded.

**Rendering** — The Pixi.js WebGL renderer handles the visual output. Complex vector regions, high-count stitch grids, interactive palette highlighting — all GPU-accelerated, all fluid. The renderer was chosen because embroidery patterns can contain thousands of small regions, and DOM-based rendering collapses under that load.

## No Cloud. No Subscription. No Accounts.

MagpieApp runs on your machine. Your images stay on your machine. Your patterns are saved as files in folders you control.

This matters for the same reason it always matters: the tool should work when the Wi-Fi doesn't. It should work in five years when the company that made it has moved on. It should work because you paid for it once and it's yours.

The Tauri 2 shell means the app is a real desktop application — native window, native file dialogs, native performance. The Rust backend means the heavy computation doesn't depend on a server round-trip. The whole thing is self-contained.

## The Aesthetic

The UI follows Editorial Modernism — the same design language as this site. Swiss-inspired typography, high-contrast layouts, no rounded corners, no gratuitous animation. The interface communicates through structure and hierarchy, not decoration.

Every panel, every label, every button is designed to feel like a technical manual for a precision instrument. Because that's what it is.
