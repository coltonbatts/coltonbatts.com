# Terminal Core + Esoterica Cult Design System

This document defines the "possessed" styling layer applied to the site.

## Design Principles

1.  **Terminal Core**: The interface is a tool. It is raw, structural, and precise.
    *   **No Softness**: Border radius is 0. Shadows are hard stamps.
    *   **Typography is Infrastructure**: `Geist Pixel` provides the structural grid. `IBM Plex Mono` labels the machinery.
    *   **High Contrast**: Black and White are the only true colors. Greys are for inactive states.

2.  **Esoterica Cult**: The machine has a history. It is marked with sigils of operation.
    *   **Micro-Motifs**: Corner marks, seals, and divider glyphs appear at key structural points.
    *   **Ritual Motion**: Elements resolve-in with step-functions, like a boot sequence, not a fluid slide.
    *   **Marginalia**: Metadata is treated like etched serial numbers.

## Token List

### Typography
*   **Primary (Sans)**: `Geist Pixel` (System UI fallback)
*   **Technical (Mono)**: `IBM Plex Mono`
*   **Scale**: defined in `tailwind.config.mjs` (avoiding <12px for readability).

### Surface
*   **Borders**: Hairline (1px or 2px). No rounding.
*   **Shadows (Stamped)**:
    *   `stamp-sm`: 1px hard offset
    *   `stamp`: 2px hard offset
    *   `stamp-md`: 3px hard offset
    *   `stamp-lg`: 5px hard offset (featured items)

## Motif Inventory

Located in `/public/motifs/`. Use via `<Motif name="..." />`.

*   `corner`: A 90-degree bracket for framing content.
*   `seal`: A geometric circle/cross mark for "approved" or "official" blocks.
*   `divider`: A horizontal line with a central break/diamond.

## Application Guide

To apply the vibe to a new component:
1.  Use `border-1` or `border-2`.
2.  Apply `shadow-stamp`.
3.  Use `font-mono` for labels.
4.  Add a `<Motif name="corner" />` in the top-right absolute position if it's a major container.
