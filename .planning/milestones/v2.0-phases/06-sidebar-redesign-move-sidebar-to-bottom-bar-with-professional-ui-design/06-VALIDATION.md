---
phase: 06
slug: sidebar-redesign
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/__tests__/components.test.tsx` |
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
| 06-01-01 | 01 | 1 | UI-GLASSMORPHISM | CSS | N/A | N/A | manual-only |
| 06-01-02 | 01 | 1 | UI-TOPBAR | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-01-02 | 01 | 1 | UI-BOTTOMBAR | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-01-02 | 01 | 1 | UI-PANELS | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-02-01 | 02 | 2 | UI-LAYOUT-REWIRE | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-02-01 | 02 | 2 | UI-PANEL-CONTENT | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-02-01 | 02 | 2 | UI-CROP-PANEL | integration | `npx vitest run src/__tests__/components.test.tsx` | yes | green |
| 06-02-02 | 02 | 2 | UI-SLIDER-RESTYLE | CSS | N/A | N/A | manual-only |
| 06-02-03 | 02 | 2 | UI-RESPONSIVE | CSS | N/A | N/A | manual-only |
| 06-02-03 | 02 | 2 | UI-VISUAL-VERIFY | checkpoint | N/A | N/A | manual-only (approved) |

*Status: green = all passing, manual-only = visual/CSS verification*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Glassmorphism frosted glass effect on bars and panels | UI-GLASSMORPHISM | CSS backdrop-filter visual effect | Check .glass and .glass-panel classes produce frosted glass in browser |
| Premium slider styling with accent thumb | UI-SLIDER-RESTYLE | CSS range input styling | Drag sliders, verify rounded #2A9D8F thumb and styled track |
| Centered panels on desktop, full-width on mobile | UI-RESPONSIVE | Responsive breakpoints | Resize browser to verify panel width changes at md breakpoint |
| Complete visual redesign approval | UI-VISUAL-VERIFY | Human checkpoint | Approved during Phase 6 execution (Task 3 checkpoint) |

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
| Gaps found | 9 |
| Resolved (automated) | 6 |
| Manual-only | 4 |
| Escalated | 0 |

Tests added to `components.test.tsx`:
- TopBar: renders nav links and action buttons
- BottomBar: renders 6 tabs
- Panel toggle: open/close/switch behavior
- Editor layout: TopBar + BottomBar present, no Sidebar
- Panel content: correct controls per tab
- Crop tab: triggers enterCropMode
