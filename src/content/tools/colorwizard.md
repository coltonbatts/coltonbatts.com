---
name: ColorWizard
oneLiner: Spectral color mixing engine for oil painters. Mix pigments on screen the way they behave on canvas.
status: beta
platform: macOS
version: "0.1.0"
lastUpdated: "2025.01"
ownershipType: Own-Forever
repoUrl: https://github.com/coltonbatts/colorwizard
techStack:
  - Swift
  - SwiftUI
  - Metal / GPU Compute
  - Kubelka-Munk Spectral Model
  - CoreImage
links:
  - label: GitHub
    url: https://github.com/coltonbatts/colorwizard
heroImage: /art/tools/colorwizard-hero.png
bullets:
  - Kubelka-Munk spectral mixing — not RGB averaging.
  - Physically modeled pigment database (Cadmium, Ultramarine, etc.).
  - Real-time GPU-accelerated color preview via Metal.
  - Palette export to Procreate, JSON, and CSS variables.
  - Works 100% offline. No accounts, no cloud.
hardware:
  minimum: "macOS 14 Sonoma, Apple Silicon (M1)"
  recommended: "Mac Studio / M1 Max, 32GB unified memory"
  notes: "Metal GPU required for real-time spectral preview. Intel Macs not supported."
---

## Why Spectral Mixing Matters

Every digital color picker lies to painters. RGB blending treats color as light — additive, clean, predictable. But oil paint is subtractive. When you mix Cadmium Yellow with Ultramarine Blue on a palette, you don't get a clean green. You get a chromatic gray with a green bias, because those pigments absorb overlapping wavelengths.

ColorWizard uses the Kubelka-Munk reflectance model to simulate how real pigments interact at the spectral level. Each pigment in the database is defined by its absorption (K) and scattering (S) coefficients across the visible spectrum. When you mix two colors, the engine blends their spectral curves — not their screen values — and converts the result back to a display color.

The difference is immediate. Mixes that would look wrong in Photoshop look right here, because the math respects the physics.

## The Algorithm

The core pipeline runs in three stages:

**1. Spectral Lookup** — Each pigment maps to a 36-point spectral reflectance curve (380nm to 730nm, 10nm steps). These curves are measured from real paint samples, not approximated from sRGB.

**2. K-M Blending** — For a given ratio of Pigment A to Pigment B, the engine computes weighted K/S values at each wavelength, then derives the mixed reflectance curve. This handles non-linear absorption correctly — the reason Phthalo Blue overpowers Titanium White at low concentrations.

**3. Display Conversion** — The blended spectral curve is multiplied by the CIE D65 illuminant and the 1931 2-degree observer functions to produce XYZ tristimulus values, then converted to Display P3 for the screen.

All of this runs on the GPU via Metal compute shaders. A full palette of 12 pigments mixed pairwise at 10 ratio steps renders in under 2ms on M1.

## No Cloud. No Subscription. No Accounts.

ColorWizard runs on your machine and stays on your machine. There is no server. There is no login screen. There is no "free tier" with a premium upsell.

You download it. You own it. If Apple nukes the App Store tomorrow, the binary on your disk still works. Your palettes are saved as plain JSON in a folder you can see, copy, and back up however you want.

This isn't a philosophical stance for its own sake. It's practical. Painters work in studios, often without reliable internet. The tool needs to work in a barn in Marfa the same way it works in a Brooklyn loft. No loading spinners. No "reconnecting..." banners. Just the tool.

## Built for the Studio

The interface is designed for a single context: a painter standing at a desk with a Mac, making decisions about pigment before touching a canvas. The UI is sparse, high-contrast, and keyboard-navigable. No onboarding flows. No tooltips. No feature announcements.

The palette view shows spectral curves alongside swatches so you can see *why* a mix behaves the way it does. The pigment database is editable — if you're working with a specific brand's formulation, you can adjust the K/S coefficients to match.

Everything about this tool assumes you know what you're doing and just need the math to be correct.
