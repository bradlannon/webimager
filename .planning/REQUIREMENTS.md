# Requirements: WebImager

**Defined:** 2026-03-13
**Core Value:** Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### File I/O

- [ ] **FILE-01**: User can upload an image via drag-and-drop or file picker (JPEG, PNG, WebP)
- [ ] **FILE-02**: Images exceeding safe canvas pixel limits are auto-downscaled on upload with notification
- [ ] **FILE-03**: EXIF orientation is auto-corrected on upload so photos display correctly
- [ ] **FILE-04**: User can download processed image as JPEG or PNG with quality slider

### Transforms

- [ ] **TRAN-01**: User can resize image by entering width/height with aspect ratio lock toggle
- [ ] **TRAN-02**: User can rotate image 90 degrees left or right
- [ ] **TRAN-03**: User can flip image horizontally or vertically

### Crop

- [ ] **CROP-01**: User can free-drag a resizable rectangle to crop the image
- [ ] **CROP-02**: User can lock crop to aspect ratio presets (16:9, 1:1, 4:3, etc.)

### Adjustments

- [ ] **ADJT-01**: User can adjust brightness via slider with live preview
- [ ] **ADJT-02**: User can adjust contrast via slider with live preview
- [ ] **ADJT-03**: User can adjust saturation via slider with live preview
- [ ] **ADJT-04**: User can convert image to greyscale with one click

### UX

- [ ] **UX-01**: All effects render as live preview in real-time
- [ ] **UX-02**: Privacy indicator shows users their photo never leaves the browser

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Effects

- **EFCT-01**: User can apply blur with adjustable intensity
- **EFCT-02**: User can apply sharpen with adjustable intensity
- **EFCT-03**: User can apply preset filters (sepia, vintage, warm, cool, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | No server, no state -- client-side only |
| Batch processing | Single image workflow for v1 simplicity |
| Backend processing | Core constraint -- everything runs in-browser |
| Mobile-native app | Web-only; should be responsive but not native |
| Layers / undo history stack | Keeps it simple, not Photoshop |
| Before/after comparison | Live preview is sufficient for v1 |
| AI-powered effects | Requires large model downloads or server -- violates constraints |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILE-01 | Phase 1 | Pending |
| FILE-02 | Phase 1 | Pending |
| FILE-03 | Phase 1 | Pending |
| FILE-04 | Phase 1 | Pending |
| TRAN-01 | Phase 3 | Pending |
| TRAN-02 | Phase 1 | Pending |
| TRAN-03 | Phase 1 | Pending |
| CROP-01 | Phase 3 | Pending |
| CROP-02 | Phase 3 | Pending |
| ADJT-01 | Phase 2 | Pending |
| ADJT-02 | Phase 2 | Pending |
| ADJT-03 | Phase 2 | Pending |
| ADJT-04 | Phase 2 | Pending |
| UX-01 | Phase 1 | Pending |
| UX-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
