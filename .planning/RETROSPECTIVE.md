# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — AI Background Removal

**Shipped:** 2026-03-15
**Phases:** 7 | **Plans:** 12 (11 executed, 1 superseded) | **Tests:** 176

### What Was Built
- In-browser AI background removal with Web Worker (RMBG-1.4 via @huggingface/transformers)
- Transparency-aware export pipeline (PNG auto-promotion, JPEG white-fill, format warnings)
- Solid color background replacement with live canvas preview
- Professional bottom bar UI with glassmorphism styling (replaced sidebar)
- Cursor-centered zoom/pan (25%-300%) with floating glassmorphism controls
- Worker lifecycle management: hook-in-persistent-parent pattern for tab switching resilience

### What Worked
- Milestone audit caught 3 real bugs (restore toggle, worker unmount, status desync) that would have shipped broken — the audit → gap-closure cycle is essential
- Integration checker traced every requirement through its full wiring path, catching the status desync that phase-level verification missed
- Web Worker architecture kept UI responsive during model download and inference — correct call from research phase
- CSS checkerboard (instead of canvas-drawn) was the right approach — simpler and decoupled from render pipeline
- Phase 6 sidebar redesign was a natural inflection point that improved the UX significantly
- Small gap-closure phases (8, 9, 10) were fast to plan and execute — surgical fixes

### What Was Inefficient
- Phases 4-6 were executed before the verifier was integrated, requiring the audit to catch issues that would have been found earlier
- Plan 04-03 was superseded by Phase 6 (sidebar redesign) — the initial plan assumed sidebar wiring that was replaced. Better to detect and skip superseded plans earlier
- Three separate gap-closure phases (8, 9, 10) could have been a single phase with 3 plans — more overhead from phase-level verification × 3
- ROADMAP.md progress table had inconsistent milestone column formatting throughout v2.0

### Patterns Established
- Hook-in-persistent-parent pattern: call hooks in the component that never unmounts, thread state via props
- Integration checker as milestone gate: catches cross-phase wiring bugs that per-phase verification misses
- destination-over compositing for background replacement (paint behind subject)
- Native wheel event listeners for zoom (React 19 passive event workaround)
- translate-then-scale CSS transform order for simpler pan math

### Key Lessons
1. Phase-level verification is necessary but not sufficient — integration checker catches the gaps between phases
2. UI redesigns (Phase 6) can invalidate earlier plans — flag and skip superseded plans rather than executing stale ones
3. Gap-closure phases should be batched into fewer, larger phases to reduce per-phase overhead
4. The hook-in-persistent-parent pattern is the correct React pattern for background tasks that must survive component unmounting
5. CSS-based visual indicators (checkerboard) should be preferred over canvas-drawn ones when they don't need to participate in the render pipeline

### Cost Observations
- Model mix: Quality profile (Opus for orchestration/execution, Sonnet for verification/checking)
- Gap closure cycles: 3 phases across 2 audit rounds
- Notable: Entire v2.0 milestone (7 phases, 12 plans) completed in ~2 days wall-clock time

---

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
| v2.0 | 3+ | 7 | Added milestone audit → gap-closure cycle; integration checker as quality gate |

### Cumulative Quality

| Milestone | Tests | Zero-Dep Additions |
|-----------|-------|-------------------|
| v1.0 | 114 | 0 (only cropper.js was considered, then rejected) |
| v2.0 | 176 | 1 (@huggingface/transformers — necessary for AI inference) |

### Top Lessons (Verified Across Milestones)

1. Non-destructive pipelines scale well — each new feature plugs in without touching existing code (v1.0 adjustments → v2.0 mask compositing)
2. Research before planning prevents wrong library choices (Cropper.js rejection in v1.0, CSS checkerboard over canvas-drawn in v2.0)
3. Integration checking catches bugs that per-component verification misses — essential at milestone boundaries
4. Small, surgical gap-closure phases are effective but should be batched to reduce overhead
