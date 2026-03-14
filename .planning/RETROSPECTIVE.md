# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-14
**Phases:** 3 | **Plans:** 8 | **Tests:** 114

### What Was Built
- Non-destructive canvas render pipeline with Zustand state management
- Upload with drag-and-drop, EXIF correction, auto-downscale for canvas safety
- Brightness, contrast, saturation sliders with GPU-accelerated ctx.filter
- Interactive free-drag crop overlay with 8 handles and aspect ratio presets
- Resize with aspect lock, pixel/percentage modes, and upscale warnings
- Download as JPEG/PNG with quality control
- Responsive layout (sidebar → bottom bar) with system dark/light mode

### What Worked
- TDD approach for data layers caught issues early and gave confidence to build UI on top
- Non-destructive pipeline decision paid off immediately — adding adjustments and crop to the existing render loop was straightforward
- Research phase correctly identified that Cropper.js was wrong for a canvas-based app — custom overlay was the right call
- Wave-based parallel execution for Wave 2 of Phase 3 (crop UI + resize UI built simultaneously)
- ctx.filter for adjustments eliminated pixel manipulation entirely — GPU-accelerated and instant

### What Was Inefficient
- VALIDATION.md frontmatter (nyquist_compliant) wasn't updated after tests passed — documentation gap
- Crop + transform bug (coordinates not following flips/rotations) could have been caught by planning if the coordinate mapping was specified more explicitly in the plan

### Patterns Established
- State-driven render pipeline: all edits as declarative parameters, single renderToCanvas function
- Zustand store with typed actions pattern (setAdjustment, rotateLeft, setCrop, etc.)
- Collapsible sidebar sections for each feature area
- Human checkpoint at end of each UI plan for visual verification
- Percentage-based coordinates for resolution-independent crop regions

### Key Lessons
1. When adding spatial operations (crop) to a transform pipeline, explicitly specify how coordinates transform with each operation — this is where bugs hide
2. ctx.filter is vastly underused — handles brightness, contrast, saturation, and grayscale with zero manual pixel work
3. Custom UI overlays on canvas are simpler than integrating crop libraries that expect `<img>` elements
4. createImageBitmap is the right tool for resize — no library needed

### Cost Observations
- Model mix: Quality profile (Opus for research/roadmap, Sonnet for verification/checking)
- Sessions: 2 (rate limit interrupted Phase 3 Wave 1)
- Notable: All 3 phases completed in ~6 hours of wall-clock time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 2 | 3 | Initial project — established all patterns |

### Cumulative Quality

| Milestone | Tests | Zero-Dep Additions |
|-----------|-------|-------------------|
| v1.0 | 114 | 0 (only cropper.js was considered, then rejected) |

### Top Lessons (Verified Across Milestones)

1. Non-destructive pipelines scale well — each new feature plugs in without touching existing code
2. Research before planning prevents wrong library choices (Cropper.js rejection saved significant rework)
