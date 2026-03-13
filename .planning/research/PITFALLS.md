# Pitfalls Research

**Domain:** Browser-based client-side image editor
**Researched:** 2026-03-13
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Canvas Memory Limits Crash Mobile Browsers

**What goes wrong:**
iOS Safari enforces a hard canvas area limit of 16,777,216 pixels (width x height) per canvas and a total canvas memory budget of ~384MB across all canvases. A 10MB JPEG photo from a modern phone camera can easily be 4000x6000 pixels (24 megapixels) -- well over the 16.7 megapixel limit. When exceeded, Safari silently renders transparent/black canvases or crashes the tab. Desktop browsers are more lenient but still have limits.

**Why it happens:**
Developers test on desktop with smaller images and never hit the limit. The 10MB file size limit in PROJECT.md does not correlate with pixel dimensions -- a highly compressed 10MB JPEG can be 8000x6000 pixels.

**How to avoid:**
- On image load, read the actual pixel dimensions (naturalWidth/naturalHeight) before drawing to canvas
- If width x height exceeds a safe threshold (e.g., 4096x4096 = 16.7M pixels), downscale the image proportionally before putting it on canvas
- Track total canvas memory usage if using multiple canvases (preview, crop overlay, etc.)
- Use `canvas.width = 0; canvas.height = 0;` to explicitly release canvas memory when done

**Warning signs:**
- Testing only with small/medium images during development
- Multiple canvas elements created without cleanup
- No dimension validation on upload
- Users reporting blank/black images on mobile

**Phase to address:**
Phase 1 (image upload/display). Dimension validation and downscaling must be baked into the upload pipeline from day one.

---

### Pitfall 2: Main Thread Blocking During Pixel Operations

**What goes wrong:**
Canvas `getImageData` and `putImageData` are synchronous operations. Applying effects like brightness, contrast, greyscale, or blur requires iterating over every pixel. On a 4000x3000 image (12 million pixels, 48 million RGBA values), this freezes the UI for 500ms-2s. Users think the app is broken, and the browser may show a "page unresponsive" dialog.

**Why it happens:**
The naive approach -- get pixels, loop, put pixels -- works perfectly on small test images. The problem only surfaces at real-world image sizes. Developers often ship this because "it works on my machine" with their 800x600 test image.

**How to avoid:**
- Use OffscreenCanvas with Web Workers for all pixel manipulation (greyscale, brightness, contrast, blur, sharpen, filters)
- Fall back to chunked processing with requestAnimationFrame if OffscreenCanvas is not supported
- Show a loading indicator during any operation that takes >100ms
- For slider-driven adjustments (brightness, contrast), debounce or throttle the processing -- do not re-process on every input event

**Warning signs:**
- No loading/progress indicators in the UI
- Slider adjustments feel laggy or jerky
- Processing functions are called directly in event handlers without debouncing
- No Web Worker architecture in the codebase

**Phase to address:**
Phase 2 (effects/adjustments). The architecture decision for where processing runs must be made before building any effects. Retrofitting Workers is painful.

---

### Pitfall 3: Destructive Editing Pipeline Ruins Image Quality

**What goes wrong:**
Each time you draw an image to canvas, apply an effect, and read it back, you lose quality. JPEG re-encoding at each step compounds artifacts. Applying brightness, then contrast, then saturation as three sequential canvas draws degrades the image noticeably. Users end up with blurry, artifact-laden results.

**Why it happens:**
The simplest implementation applies each effect to the current canvas state. This is destructive -- each step uses the already-modified pixels as input. After 3-4 operations, quality loss is visible.

**How to avoid:**
- Always keep the original uploaded image data in memory (as an ImageBitmap or cached ImageData)
- Apply all current effects as a single composite operation from the original source, never chain effect-on-effect
- Store effects as a parameter object (e.g., `{ brightness: 10, contrast: 5, greyscale: false }`) and re-render from original each time any parameter changes
- Only encode to JPEG/PNG once, at final download time

**Warning signs:**
- No reference to original image data after initial load
- Effects applied sequentially to canvas state
- Image quality visibly degrades after multiple adjustments
- No "reset" functionality or it requires re-uploading the image

**Phase to address:**
Phase 1 (architecture). The non-destructive pipeline pattern must be established before any effects are built. This is an architectural decision, not a feature decision.

---

### Pitfall 4: EXIF Orientation Causes Rotated/Flipped Images

**What goes wrong:**
Phone cameras store photos with EXIF orientation metadata. The actual pixel data may be rotated 90/180/270 degrees, with the EXIF tag telling viewers how to display it. When you draw this image to canvas, the canvas ignores EXIF data and shows the raw pixel orientation. Users see their portrait photo sideways.

**Why it happens:**
Modern browsers (Chrome 81+, Firefox 78+, Safari 13.1+) now auto-correct orientation when rendering `<img>` elements, so developers may not notice the issue when displaying the uploaded image. But canvas `drawImage()` and `createImageBitmap()` behavior varies -- some browsers respect EXIF, some do not, and the behavior has changed across versions.

**How to avoid:**
- Use `createImageBitmap(file, { imageOrientation: 'flipY' })` or the newer `imageOrientation: 'from-image'` option where supported
- Read EXIF orientation from the file before drawing (libraries like exif-js or a minimal EXIF parser)
- Apply the correct rotation/flip transform on the canvas before the first drawImage call
- Test with actual phone photos, not just test images from a computer

**Warning signs:**
- Testing only with screenshots or web-downloaded images (these typically have no EXIF orientation)
- No EXIF handling code in the upload pipeline
- User reports of sideways or mirrored images, especially from iPhones

**Phase to address:**
Phase 1 (image upload). Must be solved at upload time before any processing occurs.

---

### Pitfall 5: toDataURL for Download Blocks UI and Fails on Large Images

**What goes wrong:**
`canvas.toDataURL()` is synchronous, encodes the entire image as a base64 string (33% larger than binary), and can exceed browser URL length limits for large images. On a 4000x3000 canvas, this creates a ~48MB base64 string synchronously, freezing the browser for seconds. On some mobile browsers it simply fails silently.

**Why it happens:**
Every "download canvas as image" tutorial uses toDataURL because it is simple. It works fine for small canvases. Developers copy-paste this pattern without understanding the scaling characteristics.

**How to avoid:**
- Use `canvas.toBlob()` instead -- it is asynchronous and produces binary data (no 33% base64 overhead)
- Create a download link with `URL.createObjectURL(blob)` and programmatically click it
- Revoke the object URL after download to free memory: `URL.revokeObjectURL(url)`
- Specify JPEG quality parameter (0.85-0.92 is a good range) to control output file size

**Warning signs:**
- Any usage of `toDataURL()` in the codebase for download functionality
- No quality parameter specified when exporting JPEG
- Download functionality not tested with large (3000+ pixel) images
- No object URL cleanup (memory leaks from accumulated blobs)

**Phase to address:**
Phase 3 (download/export). Use toBlob from the start; do not implement toDataURL and plan to "fix it later."

---

### Pitfall 6: Crop Selection Does Not Account for Display vs. Actual Dimensions

**What goes wrong:**
The image displayed in the editor is scaled to fit the viewport (e.g., a 4000x3000 image shown at 800x600 CSS pixels). The crop selection rectangle is drawn in display coordinates. When the crop is applied, developers use display coordinates directly, producing a tiny cropped image (800x600 max) instead of mapping back to the full-resolution original.

**Why it happens:**
The coordinate mapping between display size and actual image size is not obvious. On non-Retina displays, the developer may not notice because display and canvas pixels are 1:1 at the scale they tested.

**How to avoid:**
- Maintain a clear ratio between display dimensions and source image dimensions
- All crop coordinates must be transformed: `actualX = displayX * (sourceWidth / displayWidth)`
- On HiDPI/Retina displays, account for `window.devicePixelRatio` -- the canvas backing store should be `displayWidth * devicePixelRatio` to avoid blurry rendering
- Test crop output dimensions against expected values with images of known size

**Warning signs:**
- Cropped images are always small regardless of source image size
- Crop looks correct in preview but output is blurry or wrong size
- No coordinate transformation logic in crop implementation
- No devicePixelRatio handling anywhere in the codebase

**Phase to address:**
Phase 2 (crop feature). Coordinate mapping must be designed before implementing the crop UI.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Processing on main thread | Simpler code, no Worker setup | UI freezes on large images, unusable on mobile | Never for production; acceptable only for initial proof-of-concept |
| Storing full canvas snapshots for undo | Simple implementation | Memory explodes: each snapshot of a 4000x3000 image is ~48MB | Never -- store effect parameters instead |
| Using CSS filters for preview | GPU-accelerated, instant | Cannot extract CSS-filtered result to download; must re-implement in canvas for export | Acceptable if you also implement canvas-based processing for export |
| Hardcoded canvas dimensions | Quick setup | Breaks on different screen sizes, fails on mobile | Never |
| Single canvas for everything | Less DOM, simpler code | Redraws everything on every interaction (crop handle drag = full re-render) | MVP only; separate into layers before adding interactive features |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-applying all effects on every slider tick | Slider feels laggy, CPU pegged at 100% | Debounce slider input (50-100ms), use requestAnimationFrame | Images > 2 megapixels |
| Creating new ImageData on every effect call | Garbage collection pauses, memory spikes | Reuse a single ImageData buffer, write back to it | Images > 1 megapixel with rapid adjustments |
| Multiple canvas redraws per frame | Flickering, dropped frames, high GPU usage | Batch all changes into a single requestAnimationFrame callback | Any interactive operation (drag, slider) |
| Loading full-resolution image into preview | Slow initial render, excessive memory | Generate a display-sized preview; process full-res only at export | Source images > 3000px in either dimension |
| Not releasing object URLs | Memory leaks accumulate over session | Call URL.revokeObjectURL() after use | After 5-10 export/download operations |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Not validating file type beyond extension | User uploads a malicious HTML file renamed to .jpg; if served back, XSS risk | Validate MIME type via file header bytes (magic numbers), not just file extension or `file.type` |
| Trusting client-side file size check alone | Browser memory exhaustion with extremely large images | Validate both file size AND pixel dimensions after decoding |
| Using innerHTML to display file metadata | XSS via crafted EXIF data containing script tags | Use textContent for any user/file-derived strings displayed in UI |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress feedback during processing | User clicks button, nothing happens, clicks again, queues duplicate work | Show spinner/progress bar immediately; disable controls during processing |
| Crop handle too small for touch | Mobile users cannot grab crop corners/edges | Make crop handles at least 44x44px touch target; add edge dragging, not just corner |
| No visual feedback when image is processing | Users think app is frozen | Dim the image or show overlay spinner during effect application |
| Downloading produces unexpected format | User uploads PNG with transparency, downloads JPEG (white background) | Default download format to match upload format; warn when converting PNG to JPEG about transparency loss |
| Sliders with no numeric display | Users cannot set precise values or communicate settings | Show current numeric value next to each slider; allow direct number input |
| No way to reset individual effects | User must re-upload to undo a single bad adjustment | Provide per-effect reset buttons and a global "Reset All" |

## "Looks Done But Isn't" Checklist

- [ ] **Image upload:** Often missing dimension validation -- verify images over 4096x4096 are downscaled before canvas processing
- [ ] **Crop:** Often missing coordinate mapping -- verify cropped output dimensions match expected full-resolution values, not display-scaled values
- [ ] **Effects/filters:** Often missing non-destructive pipeline -- verify applying brightness then contrast then resetting brightness returns to original contrast-only state
- [ ] **Download:** Often missing format/quality handling -- verify JPEG quality parameter is set, PNG transparency preserved, and toBlob (not toDataURL) is used
- [ ] **Rotate:** Often missing canvas resize -- verify rotating a 4000x3000 image produces a 3000x4000 canvas, not a cropped/squished result in the original dimensions
- [ ] **Mobile:** Often missing touch event handling -- verify crop drag works with touch, sliders work on mobile, and no pinch-zoom conflicts with crop gestures
- [ ] **HiDPI:** Often missing devicePixelRatio handling -- verify canvas is crisp on Retina displays, not blurry at 2x
- [ ] **Memory:** Often missing cleanup -- verify opening and processing 5 images in sequence does not leak memory (check browser task manager)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Canvas memory crashes on mobile | LOW | Add dimension check at upload; downscale before canvas. Isolated to upload pipeline. |
| Main thread blocking | MEDIUM | Requires extracting processing logic into Web Workers. If effects are pure functions, migration is straightforward; if they depend on DOM, refactoring needed. |
| Destructive editing pipeline | HIGH | Requires re-architecting how effects are applied. Must add original image caching and parameter-based re-rendering. Touches every effect implementation. |
| Wrong crop coordinates | LOW | Fix the coordinate transformation math. Contained to crop feature. |
| toDataURL for download | LOW | Replace with toBlob + createObjectURL. Small, isolated change. |
| Missing EXIF orientation | MEDIUM | Add EXIF reading to upload pipeline and apply rotation. May require re-testing all downstream features with rotated images. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Canvas memory limits | Phase 1: Upload/Display | Upload a 4000x6000 iPhone photo on iOS Safari; confirm it displays correctly |
| Main thread blocking | Phase 2: Effects | Apply greyscale to a 4000x3000 image; UI must remain responsive (no frame drops) |
| Destructive editing | Phase 1: Architecture | Apply brightness +50, then contrast +30, then set brightness to 0; result should show only contrast +30 applied to original |
| EXIF orientation | Phase 1: Upload | Upload portrait photos from iPhone and Android; confirm correct orientation |
| toDataURL download | Phase 3: Export | Download a 4000x3000 image as JPEG; confirm it completes without freezing and output file is correct |
| Crop coordinate mapping | Phase 2: Crop | Crop a 4000x3000 image displayed at 800x600; output should be proportionally correct at full resolution |
| HiDPI blurriness | Phase 1: Display | View editor on a Retina display; canvas content should be sharp, not blurry |
| Touch/mobile crop | Phase 2: Crop | Perform crop selection on mobile device with touch; handles should be grabbable and draggable |

## Sources

- [Total Canvas Memory Use Exceeds The Maximum Limit - PQINA](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)
- [Canvas Area Exceeds The Maximum Limit - PQINA](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/)
- [Optimizing Canvas - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Pixel Manipulation with Canvas - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [Faster Canvas Pixel Manipulation with Typed Arrays - Mozilla Hacks](https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/)
- [HTMLCanvasElement: toBlob() - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [HTMLCanvasElement: toDataURL() - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL)
- [touch-action CSS property - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
- [Pinch Zoom Gestures with Pointer Events - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)
- [Resize Images in JavaScript the Right Way - ImageKit](https://imagekit.io/blog/how-to-resize-image-in-javascript/)

---
*Pitfalls research for: browser-based client-side image editor*
*Researched: 2026-03-13*
