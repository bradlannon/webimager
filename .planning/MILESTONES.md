# Milestones

## v2.0 AI Background Removal (Shipped: 2026-03-15)

**Phases completed:** 7 phases (4-10), 12 plans (11 executed, 1 superseded)

**Delivered:** In-browser AI-powered background removal with professional UI redesign and zoom/pan controls — entirely client-side, no server needed.

**Key accomplishments:**
- In-browser AI background removal using RMBG-1.4 model via Web Worker (~45MB download, subsequent uses instant)
- Transparency-aware export: PNG auto-promotion, JPEG white-fill, format warnings
- Solid color background replacement (white, black, custom) with live canvas preview
- Professional bottom bar UI with glassmorphism styling, replacing sidebar
- Cursor-centered zoom/pan (25%-300%) with floating glassmorphism controls
- Robust worker lifecycle: survives tab switching, clean restore/re-remove cycle

**Stats:**
- Timeline: 2 days (2026-03-13 → 2026-03-15)
- Lines of code: 5,031 TypeScript/TSX
- Tests: 176 (62 added in v2.0)
- Requirements: 17/17 satisfied (BGREM-01-06, EXPT-01-03, PZ-01-08)
- Gap closure phases: 3 (Phases 8, 9, 10 — found and fixed by milestone audit)

**Known gaps (documentation only):**
- Phases 4, 5, 6 lack VERIFICATION.md — executed before verifier was added to workflow
- All functionality confirmed working by integration checker

See: `.planning/milestones/v2.0-ROADMAP.md` for full details

---

## v1.0 MVP (Shipped: 2026-03-14)

**Phases completed:** 3 phases, 8 plans

**Delivered:** Browser-based image editor with upload, adjustments, crop, resize, rotate/flip, and download — all client-side.

**Key accomplishments:**
- Non-destructive canvas render pipeline with Zustand state management
- Upload with drag-and-drop, EXIF correction, auto-downscale
- GPU-accelerated adjustments (brightness, contrast, saturation) via ctx.filter
- Interactive free-drag crop with 8 handles and aspect ratio presets
- Resize with aspect lock and quality-aware downscaling
- Download as JPEG/PNG with quality control

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

---
