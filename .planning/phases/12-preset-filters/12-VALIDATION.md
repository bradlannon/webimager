---
phase: 12
slug: preset-filters
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | FILT-03 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "sepia"` | No — extend existing | ⬜ pending |
| 12-01-02 | 01 | 1 | FILT-03 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "hue-rotate"` | No — extend existing | ⬜ pending |
| 12-01-03 | 01 | 1 | FILT-03 | unit | `npx vitest run src/__tests__/presets.test.ts` | No — Wave 0 | ⬜ pending |
| 12-01-04 | 01 | 1 | FILT-03 | unit | `npx vitest run src/__tests__/presets.test.ts -t "unique"` | No — Wave 0 | ⬜ pending |
| 12-02-01 | 02 | 1 | FILT-04 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No — extend existing | ⬜ pending |
| 12-02-02 | 02 | 1 | FILT-04 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No — extend existing | ⬜ pending |
| 12-02-03 | 02 | 1 | FILT-04 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No — extend existing | ⬜ pending |
| 12-02-04 | 02 | 1 | FILT-04 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "default"` | Partially — extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/presets.test.ts` — stubs for FILT-03 preset definitions and filter string generation
- [ ] `src/__tests__/canvas.test.ts` — add sepia and hue-rotate filter string tests (extend existing)
- [ ] `src/__tests__/editorStore.test.ts` — add preset selection, override, and reset tests (extend existing)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preset grid displays 8-10 thumbnails with visual previews | FILT-03 | Visual rendering quality | Load image, open Filters panel, verify thumbnails show filter effect |
| Selecting preset changes image appearance immediately | FILT-04 | Visual latency perception | Select each preset, verify image updates without noticeable delay |
| Exported image includes active preset filter | FILT-03 | End-to-end visual output | Apply preset, export, compare exported file to preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
