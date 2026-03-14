---
phase: 4
slug: background-removal-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x with jsdom |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | BGREM-01 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "background"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | BGREM-01 | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | BGREM-02 | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts -t "progress"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | BGREM-03 | unit | `npx vitest run src/__tests__/backgroundRemoval.test.ts -t "inference"` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | BGREM-04 | unit | `npx vitest run src/__tests__/components.test.tsx -t "checkerboard"` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | BGREM-05 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "background"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/editorStore.test.ts` — extend with background removal state tests (backgroundRemoved, backgroundMask, toggleBackground, clearBackgroundMask, resetAll clears mask)
- [ ] `src/__tests__/backgroundRemoval.test.ts` — new file for worker message protocol unit tests (mock Worker, verify message types/payloads)
- [ ] Worker tests will need to mock `@huggingface/transformers` since actual model loading requires network

*Existing infrastructure (Vitest) covers framework needs — only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Background visually removed from image | BGREM-01 | Visual quality of mask output is subjective | Load test image, click Remove Background, verify subject is clean |
| Progress bar shows meaningful feedback | BGREM-02, BGREM-03 | Visual rendering of progress UI | Observe progress during download and inference |
| Checkerboard visible in transparent areas | BGREM-04 | CSS visual rendering | After removal, verify checkerboard shows through transparent pixels |
| Dark mode checkerboard appearance | BGREM-04 | CSS visual in dark mode | Switch to dark mode, verify checkerboard adapts |
| UI remains responsive during processing | SC-5 | Main thread blocking is a runtime behavior | Click Remove Background, verify buttons/scroll still work |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
