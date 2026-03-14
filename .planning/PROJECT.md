# WebImager

## What This Is

A browser-based image editing tool that lets anyone upload a photo, resize it, crop it with a free-drag selection, apply adjustments (brightness, contrast, saturation, greyscale), rotate/flip, and download the result. All processing happens client-side with GPU-accelerated canvas filters — no server required, no account needed.

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

### Active

(None — planning next milestone)

### Out of Scope

- User accounts / authentication — no server, no state
- Batch processing — single image workflow
- Backend processing — everything runs in-browser
- Mobile-native app — web-only, responsive design
- Layers / undo history stack — keep it simple
- AI-powered effects — requires server or large model downloads

## Context

- Shipped v1.0 with 2,932 LOC TypeScript/React across 20+ source files
- Tech stack: Vite 6.x, React, TypeScript, Tailwind CSS v4, Zustand, Canvas 2D API
- 114 Vitest tests across 9 test files
- Inspired by DonsPhotoApp (native macOS/Swift app for simple photo processing)
- Deployable as a static site (GitHub Pages, Netlify, Vercel) with zero infrastructure cost
- v2 candidates: blur/sharpen, preset filters (sepia, vintage, etc.), before/after comparison

## Constraints

- **Client-side only**: All image processing in-browser via Canvas 2D API
- **Canvas limits**: Safari caps at 16.7M pixels — auto-downscale handles this
- **Browser compat**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Static deploy**: Deployable with no server runtime

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
| Crop follows transforms | Coordinates transform with flip/rotate for correct region tracking | ✓ Good (bug found and fixed) |

---
*Last updated: 2026-03-14 after v1.0 milestone*
