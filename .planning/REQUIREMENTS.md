# Requirements: WebImager

**Defined:** 2026-03-13
**Core Value:** Users can quickly edit a photo and download the result without installing software, creating an account, or uploading to a server.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### File I/O

- [x] **FILE-01**: User can upload an image via drag-and-drop or file picker (JPEG, PNG, WebP)
- [x] **FILE-02**: Images exceeding safe canvas pixel limits are auto-downscaled on upload with notification
- [x] **FILE-03**: EXIF orientation is auto-corrected on upload so photos display correctly
- [x] **FILE-04**: User can download processed image as JPEG or PNG with quality slider

### Transforms

- [x] **TRAN-01**: User can resize image by entering width/height with aspect ratio lock toggle
- [x] **TRAN-02**: User can rotate image 90 degrees left or right
- [x] **TRAN-03**: User can flip image horizontally or vertically

### Crop

- [ ] **CROP-01**: User can free-drag a resizable rectangle to crop the image
- [ ] **CROP-02**: User can lock crop to aspect ratio presets (16:9, 1:1, 4:3, etc.)

### Adjustments

- [x] **ADJT-01**: User can adjust brightness via slider with live preview
- [x] **ADJT-02**: User can adjust contrast via slider with live preview
- [x] **ADJT-03**: User can adjust saturation via slider with live preview
- [x] **ADJT-04**: User can convert image to greyscale with one click

### UX

- [x] **UX-01**: All effects render as live preview in real-time
- [x] **UX-02**: Privacy indicator shows users their photo never leaves the browser

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
| FILE-01 | Phase 1 | Complete |
| FILE-02 | Phase 1 | Complete |
| FILE-03 | Phase 1 | Complete |
| FILE-04 | Phase 1 | Complete |
| TRAN-01 | Phase 3 | Complete |
| TRAN-02 | Phase 1 | Complete |
| TRAN-03 | Phase 1 | Complete |
| CROP-01 | Phase 3 | Pending |
| CROP-02 | Phase 3 | Pending |
| ADJT-01 | Phase 2 | Complete |
| ADJT-02 | Phase 2 | Complete |
| ADJT-03 | Phase 2 | Complete |
| ADJT-04 | Phase 2 | Complete |
| UX-01 | Phase 1 | Complete |
| UX-02 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
