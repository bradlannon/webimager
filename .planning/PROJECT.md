# WebImager

## What This Is

A browser-based image editing tool with AI-powered background removal. Users can upload a photo, remove the background with one click using in-browser AI, replace it with a solid color, adjust brightness/contrast/saturation, crop, resize, zoom/pan, and download the result. All processing happens client-side — no server required, no account needed.

## Core Value

Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## Requirements

### Validated

- ✓ Upload via drag-and-drop or file picker (JPEG, PNG, WebP) — v1.0
- ✓ Auto-downscale oversized images for canvas safety — v1.0
- ✓ EXIF orientation auto-correction — v1.0
- ✓ Download as JPEG or PNG with quality control — v1.0
- ✓ Resize with width/height inputs and aspect ratio lock — v1.0
- ✓ Rotate 90° left/right and flip horizontal/vertical — v1.0
- ✓ Free-drag crop with 8 handles and repositioning — v1.0
- ✓ Crop aspect ratio presets (1:1, 4:3, 16:9, 3:2, 4:5, 1.91:1, 5:7) — v1.0
- ✓ Brightness, contrast, saturation sliders with live preview — v1.0
- ✓ One-click greyscale toggle — v1.0
- ✓ Non-destructive render pipeline (all edits as parameters) — v1.0
- ✓ Privacy indicator (photo never leaves browser) — v1.0
- ✓ System-aware dark/light mode — v1.0
- ✓ Responsive layout (sidebar → bottom bar on mobile) — v1.0
- ✓ One-click AI background removal via in-browser RMBG-1.4 model — v2.0
- ✓ Progress bar during model download and loading indicator during inference — v2.0
- ✓ Restore original background with one click (remove/restore/re-remove cycle) — v2.0
- ✓ Checkerboard transparency display — v2.0
- ✓ Replace transparent background with solid color (white, black, custom) — v2.0
- ✓ Transparency-aware export: PNG auto-promotion, JPEG white-fill, format warning — v2.0
- ✓ Cursor-centered zoom/pan (25%-300%) with scroll wheel and trackpad pinch — v2.0
- ✓ Floating glassmorphism zoom controls with percentage display — v2.0
- ✓ Professional bottom bar UI with glassmorphism styling — v2.0

### Active

(None — planning next milestone)

### Out of Scope

- User accounts / authentication — no server, no state
- Batch processing — single image workflow
- Backend processing — everything runs in-browser
- Mobile-native app — web-only, responsive design
- Layers / undo history stack — keep it simple
- Server-side AI effects — violates client-only constraint (in-browser ML is allowed)
- Manual mask painting/eraser — introduces layer-system complexity
- Background image replacement — requires layer compositing
- Offline mode — model download requires network on first use

## Context

- Shipped v2.0 with 5,031 LOC TypeScript/React across 30+ source files
- Tech stack: Vite 6.x, React, TypeScript, Tailwind CSS v4, Zustand, Canvas 2D API, @huggingface/transformers
- 176 Vitest tests across 12+ test files
- Inspired by DonsPhotoApp (native macOS/Swift app for simple photo processing)
- Deployable as a static site (GitHub Pages, Netlify, Vercel) with zero infrastructure cost
- AI model (~45MB) downloads on first use, cached by browser for subsequent sessions
- Future candidates: blur/sharpen, preset filters (sepia, vintage, etc.), before/after comparison, edge feathering

## Constraints

- **Client-side only**: All image processing in-browser via Canvas 2D API
- **Canvas limits**: Safari caps at 16.7M pixels — auto-downscale handles this
- **Browser compat**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Static deploy**: Deployable with no server runtime
- **AI model size**: ~45MB first-use download, cached thereafter

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side processing only | Zero infrastructure, privacy-preserving, instant feedback | ✓ Good |
| Vanilla Canvas API (no Fabric.js/Konva.js) | Image editors don't need object/layer abstractions | ✓ Good |
| ctx.filter for adjustments | GPU-accelerated, no pixel manipulation needed | ✓ Good |
| Custom crop overlay (no Cropper.js) | Libraries expect `<img>`, not canvas pipeline | ✓ Good |
| Percentage-based crop coordinates | Resilient to display scaling and window resizes | ✓ Good |
| Non-destructive pipeline | All edits as state parameters, re-render from source | ✓ Good |
| createImageBitmap for resize | Browser-native GPU-accelerated, no library needed | ✓ Good |
| Zustand over Context/Redux | Lightweight, selector-based re-renders, excellent TS support | ✓ Good |
| Crop follows transforms | Coordinates transform with flip/rotate for correct region tracking | ✓ Good |
| Web Worker for AI inference | Keeps UI thread responsive during model load and inference | ✓ Good |
| @huggingface/transformers v3 + RMBG-1.4 | Best quality-to-size ratio for in-browser segmentation | ✓ Good |
| destination-in compositing for mask | Clean alpha channel, no manual pixel manipulation | ✓ Good |
| CSS checkerboard (not canvas-drawn) | Simpler, no render pipeline coupling, correct z-order | ✓ Good |
| Bottom bar with glassmorphism | Professional look, matches bradlannon.ca, better mobile UX | ✓ Good |
| Hook-in-persistent-parent pattern | useBackgroundRemoval in BottomBar survives tab switching | ✓ Good |
| Native wheel event listener | React 19 passive events prevent preventDefault — native works | ✓ Good |
| translate-then-scale CSS transform | Simpler pan math in screen space | ✓ Good |

---
*Last updated: 2026-03-15 after v2.0 milestone*
