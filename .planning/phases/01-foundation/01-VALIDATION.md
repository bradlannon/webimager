---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (pairs with Vite) |
| **Config file** | `vitest.config.ts` or inline in `vite.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FILE-01 | unit | `npx vitest run src/__tests__/imageLoader.test.ts -t "validates file type"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FILE-02 | unit | `npx vitest run src/__tests__/imageLoader.test.ts -t "downscales oversized"` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FILE-03 | integration | Manual — requires real EXIF images | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | FILE-04 | unit | `npx vitest run src/__tests__/download.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | TRAN-02 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "rotate"` | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | TRAN-03 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "flip"` | ❌ W0 | ⬜ pending |
| 01-01-07 | 01 | 1 | UX-01 | unit | `npx vitest run src/__tests__/renderPipeline.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-08 | 01 | 1 | UX-02 | unit | `npx vitest run src/__tests__/components.test.ts -t "privacy"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` + `jsdom` — dev dependencies to install
- [ ] `vitest.config.ts` or vitest config in `vite.config.ts` — framework config
- [ ] `src/__tests__/editorStore.test.ts` — covers TRAN-02, TRAN-03
- [ ] `src/__tests__/imageLoader.test.ts` — covers FILE-01, FILE-02
- [ ] `src/__tests__/download.test.ts` — covers FILE-04
- [ ] `src/__tests__/renderPipeline.test.ts` — covers UX-01
- [ ] `src/__tests__/components.test.ts` — covers UX-02
- [ ] Test fixture: EXIF-rotated JPEG for FILE-03 manual verification

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EXIF orientation correction | FILE-03 | Requires real EXIF-rotated images and visual inspection of canvas output | 1. Upload a portrait photo taken on iPhone 2. Verify it displays upright (not rotated 90°) |
| Drag-and-drop upload | FILE-01 | Drag events difficult to simulate in jsdom | 1. Drag an image file onto the drop zone 2. Verify it loads and renders |
| System dark/light mode | UX-02 | Requires OS theme toggle | 1. Toggle OS dark mode 2. Verify app theme follows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
