---
phase: 3
slug: crop-resize
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (already configured) |
| **Config file** | `vite.config.ts` (inline vitest config) |
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
| 03-01-01 | 01 | 1 | CROP-01 | unit | `npx vitest run src/__tests__/crop.test.ts -t "crop coordinates"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CROP-01 | unit | `npx vitest run src/__tests__/crop.test.ts -t "clamp"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CROP-01 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "crop"` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CROP-02 | unit | `npx vitest run src/__tests__/crop.test.ts -t "aspect ratio"` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | CROP-02 | unit | `npx vitest run src/__tests__/crop.test.ts -t "presets"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | TRAN-01 | unit | `npx vitest run src/__tests__/resize.test.ts -t "aspect lock"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | TRAN-01 | unit | `npx vitest run src/__tests__/resize.test.ts -t "bounds"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | TRAN-01 | unit | `npx vitest run src/__tests__/resize.test.ts -t "percentage"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/crop.test.ts` — covers CROP-01, CROP-02 (coordinate math, clamping, aspect ratio, presets)
- [ ] `src/__tests__/resize.test.ts` — covers TRAN-01 (dimension calculation, aspect lock, percentage mode, bounds)
- [ ] Extend `src/__tests__/editorStore.test.ts` — crop state actions

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Crop overlay drag interaction | CROP-01 | Requires pointer events on canvas overlay | 1. Enter crop mode 2. Drag handles to resize 3. Drag inside to reposition |
| Dimmed overlay appearance | CROP-01 | Visual confirmation | 1. Enter crop mode 2. Verify dark overlay outside selection |
| Aspect ratio lock during drag | CROP-02 | Requires pointer event + visual | 1. Select 16:9 preset 2. Drag handle 3. Verify ratio maintained |
| Resize with aspect lock | TRAN-01 | Input interaction | 1. Lock aspect ratio 2. Change width 3. Verify height updates proportionally |
| Full-resolution output | All | Requires file download + inspection | 1. Crop + resize 2. Download 3. Verify output dimensions match |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
