---
phase: 11
slug: blur-sharpen-safari-compatibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 \| tail -30` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1 | tail -30`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | FILT-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | COMPAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | FILT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 2 | FILT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/filters.test.ts` — stubs for blur/sharpen filter tests
- [ ] Existing infrastructure covers Safari polyfill and renderToCanvas refactor testing

*Existing vitest + jsdom infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safari adjustments render correctly | COMPAT-01 | Requires real Safari browser | Open app in Safari, load image, adjust brightness/blur/sharpen, verify visual changes |
| Blur slider has no UI freeze on large images | FILT-01 | Debounce behavior requires real interaction timing | Load large image (4000x3000+), drag blur slider rapidly, observe no freeze |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
