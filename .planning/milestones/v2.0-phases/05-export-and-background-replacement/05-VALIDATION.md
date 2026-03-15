---
phase: 05
slug: export-and-background-replacement
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/__tests__/download.test.ts src/__tests__/editorStore.test.ts src/__tests__/canvas.test.ts src/__tests__/components.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | EXPT-02 | unit | `npx vitest run src/__tests__/download.test.ts` | yes | green |
| 05-01-02 | 01 | 1 | EXPT-01 | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 05-01-02 | 01 | 1 | EXPT-03 | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 05-02-01 | 02 | 2 | BGREM-06 | unit (store) | `npx vitest run src/__tests__/editorStore.test.ts` | yes | green |
| 05-02-01 | 02 | 2 | BGREM-06 | unit (canvas) | `npx vitest run src/__tests__/canvas.test.ts` | yes | green |

*Status: green = all passing*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PNG button visually appears first with primary color | EXPT-01 | Visual styling confirmed by class assertion in test, but pixel rendering needs human eye | Upload image, remove bg, check PNG button has teal styling and appears before JPEG |
| Downloaded JPEG has white areas not black | EXPT-02 | File output pixel content requires visual inspection | Remove bg, download JPEG, open and verify no black areas |
| Replacement color renders behind subject on canvas | BGREM-06 | Canvas pixel output requires live browser | Remove bg, select white/black/custom color, verify subject visible on colored background |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-14

---

## Validation Audit 2026-03-14

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

Tests added:
- `components.test.tsx`: 4 tests (EXPT-01 button order, EXPT-03 warning visibility)
- `canvas.test.ts`: 2 tests (BGREM-06 destination-over compositing)
