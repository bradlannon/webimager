# Requirements: WebImager v3.0

**Defined:** 2026-03-15
**Core Value:** Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## v3.0 Requirements

Requirements for v3.0 milestone. Each maps to roadmap phases.

### Filters

- [x] **FILT-01**: User can blur the image with an adjustable intensity slider
- [x] **FILT-02**: User can sharpen the image with an adjustable intensity slider
- [x] **FILT-03**: User can apply preset filters (sepia, vintage, warm, cool, B&W, fade, vivid, dramatic, film grain, matte) from a visual grid
- [x] **FILT-04**: Selecting a preset overrides manual adjustment values; "None" preset restores defaults
- [x] **FILT-05**: Blur/sharpen and preset filters are integrated into the existing Adjustments panel (no new tab)

### Compatibility

- [x] **COMPAT-01**: All adjustments (brightness, contrast, saturation, blur, presets) work correctly in Safari (fix ctx.filter gap)

### Text Overlay

- [ ] **TEXT-01**: User can add text to the image with configurable font, size, and color
- [ ] **TEXT-02**: User can drag text to reposition it on the canvas
- [ ] **TEXT-03**: Text remains editable (move, edit content, change style) until user clicks "Apply"
- [ ] **TEXT-04**: Applied text is baked into the image and included in exports

### Drawing & Annotation

- [ ] **DRAW-01**: User can draw freehand strokes on the image with configurable color and thickness
- [ ] **DRAW-02**: User can add shapes (arrow, rectangle, circle, line) with configurable color and thickness
- [ ] **DRAW-03**: Drawing elements remain editable until user clicks "Apply"
- [ ] **DRAW-04**: Applied drawings are baked into the image and included in exports

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Effects

- **EFCT-01**: Before/after comparison toggle
- **EFCT-02**: Edge feathering/softness control for background removal
- **EFCT-03**: Selective blur (blur specific regions, not entire image)

### UX Enhancements

- **UX-01**: Undo/redo history stack
- **UX-02**: Keyboard shortcuts (Ctrl+Z undo, +/- zoom, etc.)
- **UX-03**: Google Fonts support in text overlay

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rich text (stroke, shadow, curved, multi-layer) | Complexity beyond simple overlay — defer to future |
| Selective blur (region-specific) | Requires masking UI — defer to future |
| Full layer system | Text/drawing use edit-until-apply pattern instead |
| Canvas drawing libraries (Fabric.js, Konva.js) | Conflicts with existing vanilla Canvas pipeline |
| Preset filter composition with manual adjustments | Override is simpler and more predictable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILT-01 | Phase 11 | Complete |
| FILT-02 | Phase 11 | Complete |
| FILT-03 | Phase 12 | Complete |
| FILT-04 | Phase 12 | Complete |
| FILT-05 | Phase 11 | Complete |
| COMPAT-01 | Phase 11 | Complete |
| TEXT-01 | Phase 13 | Pending |
| TEXT-02 | Phase 13 | Pending |
| TEXT-03 | Phase 13 | Pending |
| TEXT-04 | Phase 13 | Pending |
| DRAW-01 | Phase 14 | Pending |
| DRAW-02 | Phase 14 | Pending |
| DRAW-03 | Phase 14 | Pending |
| DRAW-04 | Phase 14 | Pending |

**Coverage:**
- v3.0 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-14 after roadmap creation*
