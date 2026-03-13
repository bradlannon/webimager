# WebImager

## What This Is

A browser-based image editing tool that lets anyone upload a photo (under 10MB), resize it, crop it with a free-drag selection, apply effects (greyscale, brightness/contrast, filters, blur/sharpen, rotate/flip), and download the result. All processing happens client-side — no server required.

## Core Value

Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Upload a single photo (under 10MB, common formats: JPEG, PNG, WebP)
- [ ] Resize image by specifying dimensions (with aspect ratio lock option)
- [ ] Free-drag crop with resizable selection rectangle
- [ ] Convert to greyscale
- [ ] Adjust brightness, contrast, and saturation via sliders
- [ ] Apply preset filters (sepia, vintage, warm, cool, etc.)
- [ ] Blur and sharpen with adjustable intensity
- [ ] Rotate 90 degrees (left/right) and flip (horizontal/vertical)
- [ ] Live preview of all effects in real-time
- [ ] Download processed image (JPEG/PNG)

### Out of Scope

- User accounts / authentication — no server, no state
- Batch processing — single image workflow for v1
- Backend processing — everything runs in-browser
- Mobile-native app — web-only, though should be responsive
- Layers / undo history stack — keep it simple, not Photoshop
- Before/after comparison toggle — live preview is sufficient

## Context

- Inspired by DonsPhotoApp, a native macOS/Swift app built for a non-technical 70-year-old user. That app handles resize, center-crop, and B&W conversion with preset sizes and drag-and-drop simplicity.
- This web version targets a general public audience with standard web UX, expanding the feature set with filters, adjustments, and free-drag cropping.
- Client-side only means it can be deployed as a static site (GitHub Pages, Netlify, Vercel, etc.) with zero infrastructure cost.
- 10MB upload limit is a UX/performance guardrail for in-browser processing.

## Constraints

- **Client-side only**: All image processing must happen in the browser — no server calls for processing
- **File size**: Must handle images up to 10MB without crashing or excessive lag
- **Browser compat**: Should work in modern browsers (Chrome, Firefox, Safari, Edge)
- **Static deploy**: Must be deployable as a static site with no server runtime

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side processing only | Zero infrastructure, privacy-preserving, instant feedback | — Pending |
| Single image workflow | Simplicity for v1, batch can come later | — Pending |
| Free-drag crop (no presets) | General audience doesn't need Don's preset sizes | — Pending |
| General public UX | Broader appeal than accessibility-first design | — Pending |

---
*Last updated: 2026-03-13 after initialization*
