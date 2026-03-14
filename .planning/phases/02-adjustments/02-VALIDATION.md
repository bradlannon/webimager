---
phase: 2
slug: adjustments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (already configured from Phase 1) |
| **Config file** | Already exists from Phase 1 |
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
| 02-01-01 | 01 | 1 | ADJT-01 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "brightness"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ADJT-02 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "contrast"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | ADJT-03 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "saturation"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | ADJT-04 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "greyscale"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | Composition | unit | `npx vitest run src/__tests__/canvas.test.ts -t "filter"` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | Reset | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "resetAll"` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/editorStore.test.ts` — add tests for adjustment actions (setBrightness, setContrast, setSaturation, toggleGreyscale, resetAll with adjustments)
- [ ] `src/__tests__/canvas.test.ts` — add tests for `buildFilterString()` composition

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slider live preview | ADJT-01..03 | Canvas rendering requires browser | 1. Drag brightness slider 2. Verify image updates in real-time |
| Greyscale visual | ADJT-04 | Visual confirmation needed | 1. Click greyscale toggle 2. Verify image converts to B&W |
| Adjustment composition | All | Visual confirmation of combined effects | 1. Set brightness + contrast + saturation 2. Verify all three reflect |
| Download with adjustments | All | Browser file download | 1. Apply adjustments 2. Download 3. Verify downloaded file includes adjustments |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
