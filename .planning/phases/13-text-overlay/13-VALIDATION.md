---
phase: 13
slug: text-overlay
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | TEXT-01, TEXT-03 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "text"` | Needs extension | ⬜ pending |
| 13-01-02 | 01 | 1 | TEXT-04 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "text"` | Needs extension | ⬜ pending |
| 13-02-01 | 02 | 2 | TEXT-01, TEXT-02, TEXT-03 | unit | `npx vitest run src/__tests__/textOverlay.test.ts` | No — Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/editorStore.test.ts` — extend with text mode, draft/bake, discard, resetAll-preserves-baked tests
- [ ] `src/__tests__/canvas.test.ts` — extend with bakedTexts rendering test (ctx.fillText called with correct args)
- [ ] `src/__tests__/textOverlay.test.ts` — new file for TextOverlay component: drag bounds, snap guides, Apply/Cancel

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Text renders visually with correct font, size, and color | TEXT-01 | Visual rendering quality | Add text, change font/size/color, verify visual appearance |
| Drag text to reposition with snap-to-center guides | TEXT-02 | Visual interaction and guide rendering | Drag text to center, verify guide lines appear |
| Text appears correctly in exported image | TEXT-04 | End-to-end visual output | Apply text, export, compare exported file to preview |
| Text positioning correct while zoomed/panned | TEXT-02 | Zoom/pan interaction | Zoom in, drag text, verify position is accurate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
