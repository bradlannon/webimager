# Requirements: WebImager v2.0

**Defined:** 2026-03-14
**Core Value:** Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## v2.0 Requirements

Requirements for v2.0 milestone. Each maps to roadmap phases.

### Background Removal

- [x] **BGREM-01**: User can remove image background with one click using in-browser AI model
- [ ] **BGREM-02**: User sees a progress bar during model download on first use (~45MB)
- [ ] **BGREM-03**: User sees a progress/loading indicator during background removal inference
- [ ] **BGREM-04**: Transparent areas display on checkerboard background
- [x] **BGREM-05**: User can restore the original background with one click
- [ ] **BGREM-06**: User can replace transparent background with a solid color (white, black, or custom picker)

### Export Integration

- [ ] **EXPT-01**: Download format auto-switches to PNG when transparency is active
- [ ] **EXPT-02**: JPEG export fills transparent areas with white
- [ ] **EXPT-03**: Warning shown when user selects JPEG with transparency active

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Effects

- **EFCT-01**: User can apply blur with adjustable intensity
- **EFCT-02**: User can apply sharpen with adjustable intensity
- **EFCT-03**: User can apply preset filters (sepia, vintage, warm, cool, etc.)

### UX Enhancements

- **UX-03**: Before/after comparison toggle
- **UX-04**: Edge feathering/softness control for background removal

## Out of Scope

| Feature | Reason |
|---------|--------|
| Manual mask painting/eraser | Introduces layer-system complexity — beyond v2.0 scope |
| Batch background removal | Single image workflow |
| Background image replacement | Requires layer compositing — beyond v2.0 scope |
| Server-side inference | Violates client-only constraint |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BGREM-01 | Phase 4 | Complete |
| BGREM-02 | Phase 4 | Pending |
| BGREM-03 | Phase 4 | Pending |
| BGREM-04 | Phase 4 | Pending |
| BGREM-05 | Phase 4 | Complete |
| BGREM-06 | Phase 5 | Pending |
| EXPT-01 | Phase 5 | Pending |
| EXPT-02 | Phase 5 | Pending |
| EXPT-03 | Phase 5 | Pending |

**Coverage:**
- v2.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
