# Requirements: WebImager v2.0

**Defined:** 2026-03-14
**Core Value:** Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## v2.0 Requirements

Requirements for v2.0 milestone. Each maps to roadmap phases.

### Background Removal

- [x] **BGREM-01**: User can remove image background with one click using in-browser AI model
- [x] **BGREM-02**: User sees a progress bar during model download on first use (~45MB)
- [x] **BGREM-03**: User sees a progress/loading indicator during background removal inference
- [ ] **BGREM-04**: Transparent areas display on checkerboard background
- [ ] **BGREM-05**: User can restore the original background with one click
- [x] **BGREM-06**: User can replace transparent background with a solid color (white, black, or custom picker)

### Export Integration

- [x] **EXPT-01**: Download format auto-switches to PNG when transparency is active
- [x] **EXPT-02**: JPEG export fills transparent areas with white
- [x] **EXPT-03**: Warning shown when user selects JPEG with transparency active

### Pan and Zoom

- [x] **PZ-01**: Scroll wheel changes zoom level (in/out)
- [x] **PZ-02**: Zoom is cursor-centered (point under cursor stays fixed)
- [x] **PZ-03**: Zoom clamped to 25%-300% range
- [x] **PZ-04**: User can drag to pan when zoomed in past fit-to-view
- [x] **PZ-05**: Panning disabled at fit-to-view zoom level
- [x] **PZ-06**: Double-click on canvas resets to fit-to-view
- [x] **PZ-07**: Floating zoom controls (+/-, percentage) render with glassmorphism styling
- [x] **PZ-08**: Store actions correctly update zoom level and pan offset

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
| BGREM-02 | Phase 4 | Complete |
| BGREM-03 | Phase 4 | Complete |
| BGREM-04 | Phase 8 (gap closure) | Pending |
| BGREM-05 | Phase 8 (gap closure) | Pending |
| BGREM-06 | Phase 5 | Complete |
| EXPT-01 | Phase 5 | Complete |
| EXPT-02 | Phase 5 | Complete |
| EXPT-03 | Phase 5 | Complete |
| PZ-01 | Phase 7 | Complete |
| PZ-02 | Phase 7 | Complete |
| PZ-03 | Phase 7 | Complete |
| PZ-04 | Phase 7 | Complete |
| PZ-05 | Phase 7 | Complete |
| PZ-06 | Phase 7 | Complete |
| PZ-07 | Phase 7 | Complete |
| PZ-08 | Phase 7 | Complete |

**Coverage:**
- v2.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after gap closure planning*
