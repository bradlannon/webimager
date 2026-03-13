# Feature Research

**Domain:** Browser-based image editor (client-side, no account, single-image workflow)
**Researched:** 2026-03-13
**Confidence:** HIGH

## Competitive Landscape Context

This product occupies a specific niche: **simple, no-signup, client-side image editing**. It is NOT competing with Photopea (Photoshop clone with layers, masks, PSD support) or Canva (design platform with templates). It IS competing with tools like ImgModify, PicResize, RedKetchup Image Resizer, and BeFunky's quick-edit mode -- tools where users land, edit one photo, and leave.

The key insight: users of these simple tools want **speed and privacy**, not power. They chose a simple tool over Photopea deliberately.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Image upload (drag-and-drop + file picker) | Every editor has this; drag-and-drop is the modern expectation | LOW | Support JPEG, PNG, WebP at minimum. Drag-and-drop is non-negotiable UX |
| Resize by dimensions | Core utility -- many users come specifically for this | LOW | Must include aspect-ratio lock toggle. Show both pixel dimensions |
| Crop with draggable selection | Every image editor has crop; free-drag is the standard interaction | MEDIUM | Need a visible, resizable selection rectangle with handles |
| Rotate (90-degree increments) | Basic orientation correction; phones often produce rotated images | LOW | Left/right 90-degree rotation buttons |
| Flip (horizontal/vertical) | Paired with rotate as basic transform; users expect both | LOW | Two buttons, trivial canvas operation |
| Brightness/contrast sliders | Most basic adjustment -- even phone editors have this | LOW | Real-time preview is critical; laggy sliders kill the experience |
| Download result | The entire point of the tool | LOW | JPEG and PNG at minimum. Respect original format by default |
| Real-time preview | Users expect to see changes as they adjust sliders | MEDIUM | Must be performant; debounce slider updates on large images |
| Responsive layout | Users will try this on tablets and phones | MEDIUM | Touch-friendly controls, but full mobile editing UX is v2 |
| No signup / no account required | Core value prop of simple editors; any login wall = user leaves | LOW | Not a feature to build, but a constraint to never violate |

### Differentiators (Competitive Advantage)

Features that set WebImager apart from the many simple editors that exist. These should align with the core value: **quick, private, zero-friction editing**.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Saturation adjustment | Many simple editors skip this; it is a common user need (e.g., making food photos pop) | LOW | Slider alongside brightness/contrast -- trivial to add once those work |
| Preset filters (sepia, vintage, warm, cool) | Users love one-click transformations; makes the tool feel polished and fun | MEDIUM | 6-8 presets is the sweet spot. Each filter is a set of adjustment values applied together |
| Greyscale conversion | Commonly needed for documents, printing, artistic effect | LOW | Single toggle; can also be a filter preset |
| Blur/sharpen with intensity | Simple editors rarely offer adjustable blur/sharpen; useful for privacy (blur faces) and photo correction | MEDIUM | Convolution kernel on canvas; must be performant on large images. Consider Web Workers |
| Format conversion on download | Users often need JPEG-to-PNG or vice versa; many simple tools lock to input format | LOW | Dropdown in download dialog; canvas.toBlob supports JPEG, PNG, WebP natively |
| Quality slider on JPEG download | Control over file size vs quality tradeoff; power users expect this | LOW | Range slider 1-100, show estimated file size if feasible |
| Client-side processing indicator | Privacy badge/message ("Your images never leave your device") builds trust | LOW | Static UI element, but meaningfully differentiates from server-upload tools |
| Keyboard shortcuts | Power users editing many images in a row expect Ctrl+Z, Ctrl+S, etc. | LOW | Low effort, high polish signal |

### Anti-Features (Deliberately NOT Building)

Features that seem good but conflict with WebImager's core value of simplicity and zero-friction.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Layers | "Real" editors have layers | Massively increases complexity (rendering, UI, state management). Turns a simple tool into a Photopea competitor -- a fight you lose | Single-image pipeline with stacked adjustments. Undo is sufficient |
| Undo/redo history stack | Users want to experiment safely | A full history stack with branching adds significant state management complexity | Simple single-level undo (revert to original) for v1. Consider linear undo stack in v1.x |
| User accounts / cloud save | Users want to resume later | Requires a backend, authentication, storage -- violates the core "no server" constraint | Browser localStorage for last session, or "save project as JSON" file |
| Batch processing | "I have 50 photos to resize" | Completely different UX paradigm; complicates the single-image workflow | Scope to v2+ if validated. Different product surface |
| AI features (background removal, object removal, generative fill) | Every competitor is adding AI | Requires ML model loading (large downloads), GPU compute, or server-side API calls. Conflicts with lightweight/client-side constraint | Stick to deterministic image processing. AI is table stakes for Canva/Pixlr, not for simple editors |
| Text/annotation overlay | "Add watermark" or "add caption" | Introduces text rendering, font loading, positioning UI -- significant scope increase for a photo editor | Out of scope. Users needing text should use Canva |
| Drawing/painting tools | "I want to draw on my photo" | Requires brush engine, pressure sensitivity, color picker -- a whole sub-product | Out of scope entirely |
| Template system | "Give me Instagram-sized templates" | Design tool, not photo editor. Different product category | Offer common resize presets (1080x1080, 1920x1080) as quick-select options instead |
| Before/after comparison toggle | Seems useful for seeing changes | PROJECT.md explicitly scopes this out; live preview serves the same purpose with less UI complexity | Real-time preview + "reset to original" button |

## Feature Dependencies

```
[Image Upload]
    |
    +---> [Real-time Preview] (canvas rendering pipeline)
    |         |
    |         +---> [Brightness/Contrast/Saturation Sliders]
    |         +---> [Preset Filters] (requires adjustment pipeline)
    |         +---> [Greyscale Toggle]
    |         +---> [Blur/Sharpen]
    |         +---> [Crop Selection]
    |         +---> [Resize Controls]
    |         +---> [Rotate/Flip]
    |
    +---> [Download] (requires rendered canvas output)
              |
              +---> [Format Selection]
              +---> [Quality Slider]

[Crop Selection] --conflicts-with--> [Adjustment Sliders] (during active crop)
[Blur/Sharpen] --requires--> [Web Workers or OffscreenCanvas] (for performance)
```

### Dependency Notes

- **Everything requires Image Upload + Canvas Pipeline:** The rendering pipeline is the foundation. Build this first and make it solid.
- **Adjustments require Real-time Preview:** Sliders without instant feedback are useless. The preview pipeline must be performant before adding adjustment features.
- **Preset Filters require Adjustment Pipeline:** Filters are just pre-configured combinations of brightness, contrast, saturation, and color matrix values. Build the adjustment system first, then filters are trivial.
- **Crop conflicts with Adjustments during interaction:** When the crop selection rectangle is active, slider adjustments should still preview but the UI needs clear mode separation (editing vs. cropping).
- **Blur/Sharpen is computationally expensive:** Unlike color adjustments (per-pixel, fast), convolution operations on large images can freeze the UI. Web Workers or OffscreenCanvas may be needed.
- **Download depends on rendered canvas:** The download feature reads the final canvas state. Format conversion and quality control are just parameters to `canvas.toBlob()`.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what validates the core value proposition of "quick, private, no-signup photo editing."

- [ ] Drag-and-drop + file picker upload (JPEG, PNG, WebP, under 10MB) -- the entry point
- [ ] Canvas-based preview with real-time rendering -- the foundation everything depends on
- [ ] Resize with dimension inputs and aspect-ratio lock -- the #1 reason users visit simple editors
- [ ] Free-drag crop with resizable selection rectangle -- the #2 reason
- [ ] Rotate 90 degrees (left/right) and flip (horizontal/vertical) -- trivial to add, expected
- [ ] Brightness, contrast, and saturation sliders with live preview -- core adjustment trifecta
- [ ] Greyscale conversion -- one toggle, high utility
- [ ] Preset filters (6-8: sepia, vintage, warm, cool, high-contrast, fade, vivid, B&W) -- polish and delight
- [ ] Blur and sharpen with intensity sliders -- differentiator, justified by project spec
- [ ] Download as JPEG or PNG with format selection -- the exit point

### Add After Validation (v1.x)

Features to add once core editing works well and users are actually using it.

- [ ] JPEG quality slider on download -- when users ask "how do I make the file smaller"
- [ ] Common resize presets (social media sizes, common print sizes) -- when resize is the most-used feature
- [ ] Single-level undo (revert to original) -- when users complain about not being able to go back
- [ ] Keyboard shortcuts -- when power users emerge
- [ ] WebP download support -- when users specifically request it
- [ ] "Your images never leave your device" privacy indicator -- when marketing the tool

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-level undo/redo stack -- significant state management complexity
- [ ] Batch processing -- different product surface entirely
- [ ] Touch-optimized mobile editing -- requires rethinking crop/slider interactions for touch
- [ ] Color temperature / tint adjustments -- nice but not essential
- [ ] Vignette effect -- could be a filter preset instead
- [ ] Image metadata (EXIF) viewer/stripper -- niche but privacy-conscious users want it
- [ ] Save/load editing state to file -- "project file" without needing accounts

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Drag-and-drop upload | HIGH | LOW | P1 |
| Canvas preview pipeline | HIGH | MEDIUM | P1 |
| Resize with aspect lock | HIGH | LOW | P1 |
| Free-drag crop | HIGH | MEDIUM | P1 |
| Rotate/flip | MEDIUM | LOW | P1 |
| Brightness/contrast/saturation | HIGH | LOW | P1 |
| Greyscale | MEDIUM | LOW | P1 |
| Download (JPEG/PNG) | HIGH | LOW | P1 |
| Preset filters | MEDIUM | LOW | P1 |
| Blur/sharpen | MEDIUM | MEDIUM | P1 |
| JPEG quality slider | MEDIUM | LOW | P2 |
| Resize presets | LOW | LOW | P2 |
| Revert to original | MEDIUM | LOW | P2 |
| Keyboard shortcuts | LOW | LOW | P2 |
| Privacy indicator | LOW | LOW | P2 |
| Multi-level undo/redo | MEDIUM | HIGH | P3 |
| Batch processing | MEDIUM | HIGH | P3 |
| Mobile-optimized editing | MEDIUM | HIGH | P3 |
| EXIF viewer/stripper | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Photopea | Pixlr | ImgModify | PicResize | BeFunky | WebImager (Our Approach) |
|---------|----------|-------|-----------|-----------|---------|-------------------------|
| Signup required | No | Optional (AI features need it) | No | No | Optional | No -- never |
| Client-side processing | Yes | No (server-side) | Yes | No (server-side) | No (server-side) | Yes -- core constraint |
| Layers | Yes | Yes | No | No | No | No -- deliberately |
| Resize | Yes | Yes | Yes | Yes | Yes | Yes |
| Crop | Yes | Yes | Yes | Yes | Yes | Yes (free-drag) |
| Filters/effects | Yes (via adjustments) | Yes (AI + manual) | Yes | Yes | Yes (extensive) | Yes (6-8 presets) |
| Blur/sharpen | Yes | Yes | No | No | Yes | Yes |
| AI features | Limited | Extensive | No | No | Yes | No -- out of scope |
| Complexity | Expert | Intermediate | Simple | Simple | Intermediate | Simple |
| Target user | Designers | Casual-to-intermediate | Quick editors | Quick resizers | Social media creators | Quick editors who value privacy |

### Key Competitive Insight

WebImager's niche is the intersection of **simple** (like ImgModify/PicResize) and **capable** (more adjustments than those tools offer) while being **fully client-side** (unlike Pixlr/BeFunky which upload to servers). The privacy angle is real -- ImgModify also processes client-side, but WebImager can offer more adjustment controls (blur/sharpen, saturation, filters) than the typical simple editor.

## Sources

- [Pixlr - Free Online Photo Editor](https://pixlr.com/)
- [Photopea - Online Photo Editor](https://www.photopea.com/)
- [ImgModify - Free Online Image Editor](https://imgmodify.com/)
- [PicResize - Crop, Resize, Edit images online](https://picresize.com/)
- [BeFunky Photo Editor](https://www.befunky.com/features/photo-editor/)
- [iLoveIMG - Online Image Editor](https://www.iloveimg.com/)
- [Shopify - Best Free Photo Editors (2025)](https://www.shopify.com/blog/14263381-18-free-and-paid-online-photo-editor-tools-for-gorgeous-diy-product-photography)
- [Cloudinary - JavaScript Image Editor Guide (2026)](https://cloudinary.com/guides/image-effects/javascript-image-editor)
- [Piktochart - Pixlr vs Photopea Comparison](https://piktochart.com/tips/pixlr-vs-photopea)

---
*Feature research for: Browser-based image editor*
*Researched: 2026-03-13*
