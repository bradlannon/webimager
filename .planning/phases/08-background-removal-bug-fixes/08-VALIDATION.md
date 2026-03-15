---
phase: 08
slug: background-removal-bug-fixes
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/__tests__/backgroundRemoval.test.ts src/__tests__/editorStore.test.ts` |
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
| 08-01-01 | 01 | 1 | BGREM-05 | integration | `npx vitest run src/__tests__/backgroundRemoval.test.ts` | yes | green |
| 08-01-01 | 01 | 1 | applyResize-bg | integration | `npx vitest run src/__tests__/editorStore.test.ts` | yes | green |
| 08-01-01 | 01 | 1 | BGREM-04 | unit | `npx vitest run src/__tests__/renderPipeline.test.ts` | yes | green |
| 08-01-01 | 01 | 1 | dead-import | static | N/A (TypeScript compilation) | N/A | green |

*Status: green = all passing*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Double-click Restore Background idempotency | BGREM-05 | Runtime interaction | Click Restore twice rapidly, verify no re-application |
| Resize after bg removal visual output | applyResize-bg | Canvas pixel output | Remove bg, resize, verify composited result is correct |

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
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

Tests added:
- `backgroundRemoval.test.ts`: 2 tests (restoreBackground calls clearBackgroundMask, not toggleBackground)
- `editorStore.test.ts`: 1 test (applyResize clears bg state after resize)
