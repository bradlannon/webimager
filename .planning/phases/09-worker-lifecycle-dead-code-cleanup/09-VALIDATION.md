---
phase: 09
slug: worker-lifecycle-dead-code-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/__tests__/backgroundRemoval.test.ts src/__tests__/components.test.tsx src/__tests__/editorStore.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/backgroundRemoval.test.ts src/__tests__/components.test.tsx src/__tests__/editorStore.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | BGREM-02 | integration | `npx vitest run src/__tests__/backgroundRemoval.test.ts` | TBD | pending |
| 09-01-01 | 01 | 1 | BGREM-03 | integration | `npx vitest run src/__tests__/backgroundRemoval.test.ts` | TBD | pending |
| 09-01-02 | 01 | 1 | dead-code | unit | `npx vitest run src/__tests__/editorStore.test.ts` | TBD | pending |
| 09-01-02 | 01 | 1 | dead-code | integration | `npx vitest run src/__tests__/components.test.tsx` | TBD | pending |

*Status: pending*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker survives tab switch during model download | BGREM-02 | Requires real ONNX model download over network | Start bg removal, switch tabs, verify progress continues |
| Loading indicator persists across tab switch | BGREM-03 | Visual rendering of progress state | Observe spinner/progress during tab switch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
