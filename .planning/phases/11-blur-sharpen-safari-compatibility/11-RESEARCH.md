# Phase 11: Blur, Sharpen, and Safari Compatibility - Research

**Researched:** 2026-03-14
**Domain:** Canvas 2D filter pipeline extension, pixel convolution, cross-browser compatibility
**Confidence:** HIGH

## Summary

Phase 11 extends the existing `ctx.filter`-based adjustment pipeline with blur and sharpen controls, refactors `renderToCanvas` to an options object, and resolves the Safari `ctx.filter` gap that silently breaks ALL existing adjustments (brightness, contrast, saturation, greyscale) on Safari. The phase touches four areas: (1) a prerequisite signature refactor, (2) blur via `ctx.filter = "blur(Npx)"`, (3) sharpen via `getImageData`/`putImageData` convolution kernel (no CSS filter equivalent exists), and (4) Safari compatibility via the `context-filter-polyfill` library or manual `getImageData` fallback.

The codebase is well-structured for this work. `buildFilterString()` in `src/utils/canvas.ts` already composes CSS filter strings -- blur is a one-line addition. Sharpen requires a new code path (`getImageData`/`putImageData` convolution) that the pipeline has never used. The `renderToCanvas` function currently takes 7 positional parameters and must be refactored to an options object before adding blur/sharpen, preventing signature churn for Phases 12-14. The Safari fix is the highest-priority item because it fixes a pre-existing bug affecting ~18% of users.

**Primary recommendation:** Refactor `renderToCanvas` to options object first, then implement Safari `ctx.filter` detection + polyfill, then add blur (CSS filter, trivial), then add sharpen (convolution kernel, new code path). Debounce blur/sharpen sliders from the start to prevent performance freezes on large images.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILT-01 | User can blur the image with an adjustable intensity slider | Blur via `ctx.filter = "blur(Npx)"` appended to `buildFilterString()`. Add `blur: number` to `Adjustments` interface. Slider range 0-20px. Must debounce for large images. |
| FILT-02 | User can sharpen the image with an adjustable intensity slider | Sharpen via 3x3 convolution kernel on `getImageData`/`putImageData`. New `src/utils/sharpen.ts`. Add `sharpen: number` to `Adjustments` interface. Slider range 0-100. Applied after `ctx.filter` draw, before mask compositing. |
| FILT-05 | Blur/sharpen controls integrated into existing Adjustments panel (no new tab) | Add two sliders to `AdjustmentControls.tsx` following existing brightness/contrast/saturation pattern. No new BottomBar tab needed. |
| COMPAT-01 | All adjustments work correctly in Safari (fix ctx.filter gap) | Safari disables `ctx.filter` through Safari 26.4. Use runtime detection + `context-filter-polyfill` (0.3.x, ~15KB) or manual `getImageData` fallback. Fixes blur AND all existing adjustments on Safari/iOS. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D `ctx.filter` | Baseline 2024 | Blur filter (`blur(Npx)`) | Already used for brightness/contrast/saturation. GPU-accelerated on Chrome/Firefox. One-line extension to `buildFilterString()`. |
| Canvas 2D `getImageData`/`putImageData` | Universal | Sharpen convolution kernel | No CSS filter equivalent for sharpen. Standard 3x3 kernel convolution. Well-documented pattern. |
| context-filter-polyfill | 0.3.14+ | Safari `ctx.filter` compatibility | Polyfills all CSS filter functions (`blur`, `brightness`, `contrast`, `saturate`, `grayscale`, `sepia`, `hue-rotate`, `invert`, `opacity`) on Safari. Import-and-forget. ~15KB. |
| Zustand | 5.x (existing) | State for blur/sharpen values | Extend existing `Adjustments` interface. No new store library. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.x (existing) | Unit tests for convolution, filter string, options refactor | Test `buildFilterString` with blur, `applySharpen` kernel math, `renderToCanvas` options API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| context-filter-polyfill | Manual `getImageData` fallback for each filter | More code, must reimplement brightness/contrast/saturate/grayscale math manually. Polyfill handles all at once. |
| context-filter-polyfill | SVG filter `url()` references | SVG filters are also broken in Safari when used via `ctx.filter`. Not a Safari workaround. |
| `getImageData` convolution for sharpen | SVG `feConvolveMatrix` via `ctx.filter = "url(#id)"` | SVG filter references via `ctx.filter` are also disabled in Safari. Would need polyfill anyway. Simpler to use `getImageData` directly for sharpen. |

**Installation:**
```bash
npm install context-filter-polyfill
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/editor.ts          # MODIFY: add blur, sharpen to Adjustments
  utils/canvas.ts          # MODIFY: refactor renderToCanvas to options, add blur to buildFilterString
  utils/sharpen.ts         # NEW: applySharpen convolution kernel function
  store/editorStore.ts     # MODIFY: add blur/sharpen defaults, update setAdjustment
  hooks/useRenderPipeline.ts  # MODIFY: pass options object to renderToCanvas
  components/AdjustmentControls.tsx  # MODIFY: add blur/sharpen sliders
  utils/download.ts        # MODIFY: pass options object to renderToCanvas
  main.tsx (or App.tsx)    # MODIFY: import context-filter-polyfill (side-effect import)
  __tests__/canvas.test.ts # MODIFY: update tests for options API, blur filter string
  __tests__/sharpen.test.ts # NEW: convolution kernel unit tests
```

### Pattern 1: renderToCanvas Options Object Refactor

**What:** Replace 7 positional parameters with a single `RenderOptions` object.
**When to use:** Now, before any feature additions.
**Example:**
```typescript
// BEFORE (current)
renderToCanvas(ctx, source, transforms, adjustments?, crop?, backgroundMask?, replacementColor?)

// AFTER
interface RenderOptions {
  transforms: Transforms;
  adjustments?: Adjustments;
  crop?: CropRegion;
  backgroundMask?: ImageData | null;
  replacementColor?: string | null;
}
renderToCanvas(ctx: CanvasRenderingContext2D, source: ImageBitmap, options: RenderOptions): void
```

**Call sites to update:**
1. `useRenderPipeline.ts` line 34
2. `download.ts` line 23
3. `editorStore.ts` line 199 (applyResize)
4. `canvas.test.ts` -- all renderToCanvas calls
5. `renderPipeline.test.ts` -- if it calls renderToCanvas directly

### Pattern 2: Sharpen Convolution Kernel

**What:** Standard 3x3 unsharp mask applied via `getImageData`/`putImageData` after the main draw call.
**When to use:** When sharpen > 0.
**Example:**
```typescript
// Source: web.dev/canvas-imagefilters, standard convolution pattern
export function applySharpen(
  ctx: CanvasRenderingContext2D,
  intensity: number // 0-100
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const srcData = src.data;
  const dstData = dst.data;

  // Interpolate kernel based on intensity (0 = identity, 100 = max sharpen)
  const amount = intensity / 100;
  // Standard sharpen kernel: [0,-1,0,-1,5,-1,0,-1,0]
  // Blended with identity kernel: [0,0,0,0,1,0,0,0,0]
  const k = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB only, skip alpha
        const i = (y * w + x) * 4 + c;
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            val += srcData[((y + ky) * w + (x + kx)) * 4 + c] * k[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dstData[i] = Math.max(0, Math.min(255, val));
      }
      dstData[(y * w + x) * 4 + 3] = srcData[(y * w + x) * 4 + 3]; // preserve alpha
    }
  }

  // Copy edge pixels from source (kernel cannot be applied at borders)
  // Top/bottom rows, left/right columns
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      dstData[x * 4 + c] = srcData[x * 4 + c];
      dstData[((h - 1) * w + x) * 4 + c] = srcData[((h - 1) * w + x) * 4 + c];
    }
  }
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      dstData[y * w * 4 + c] = srcData[y * w * 4 + c];
      dstData[(y * w + w - 1) * 4 + c] = srcData[(y * w + w - 1) * 4 + c];
    }
  }

  ctx.putImageData(dst, 0, 0);
}
```

### Pattern 3: Safari ctx.filter Detection + Polyfill

**What:** Import `context-filter-polyfill` as a side-effect at app startup. The polyfill detects whether `ctx.filter` works and patches `drawImage` and other drawing methods on Safari.
**When to use:** App entry point, before any canvas rendering.
**Example:**
```typescript
// In main.tsx or App.tsx — top-level side-effect import
import 'context-filter-polyfill';
```

The polyfill automatically detects Safari and patches canvas drawing methods. No conditional logic needed in application code. The existing `buildFilterString()` and `ctx.filter = ...` assignments continue to work unchanged.

### Pattern 4: Debounced Slider for Expensive Filters

**What:** Debounce blur and sharpen slider updates to prevent multi-second freezes on large images.
**When to use:** Blur and sharpen sliders specifically (existing brightness/contrast/saturation are cheap and do not need debouncing).
**Example:**
```typescript
// In AdjustmentControls.tsx for blur/sharpen sliders
const [localBlur, setLocalBlur] = useState(adjustments.blur);
const debouncedSetBlur = useMemo(
  () => debounce((v: number) => setAdjustment('blur', v), 150),
  [setAdjustment]
);

<input
  type="range"
  value={localBlur}
  onChange={(e) => {
    const v = Number(e.target.value);
    setLocalBlur(v);      // immediate visual feedback on slider position
    debouncedSetBlur(v);  // debounced pipeline re-render
  }}
/>
```

### Anti-Patterns to Avoid
- **Sharpen via `ctx.filter`:** There is no `sharpen()` CSS filter function. Do not attempt `ctx.filter = "sharpen(N)"` -- it silently does nothing.
- **In-place convolution:** Reading and writing the same pixel buffer during convolution produces smeared/incorrect results. Always use separate source and destination buffers.
- **SVG `feConvolveMatrix` via `ctx.filter = "url(#id)"`:** This is also blocked by Safari's disabled `ctx.filter`. Not a Safari workaround.
- **Skipping blur debounce:** Blur is O(n * r^2). A 4000x3000 image at blur radius 10 causes 500ms-2s freezes per slider tick without debouncing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safari ctx.filter compatibility | Manual pixel manipulation for brightness/contrast/saturate/grayscale/blur | `context-filter-polyfill` (npm) | Reimplementing 9 CSS filter functions in JavaScript is hundreds of lines of math. The polyfill handles all of them, is actively maintained, and is ~15KB. |
| Sharpen convolution | Nothing to avoid -- must hand-roll | Standard 3x3 kernel via `getImageData`/`putImageData` | This IS the standard approach. No library needed. ~40 lines of code. |

**Key insight:** The Safari fix is the only item that benefits from a library. Everything else (blur, sharpen, slider debouncing) is standard code.

## Common Pitfalls

### Pitfall 1: Safari ctx.filter Silently Does Nothing
**What goes wrong:** `CanvasRenderingContext2D.filter` is disabled by default in all Safari versions through 26.4 (TP included). Setting `ctx.filter = "brightness(120%)"` has zero effect. ALL existing adjustments in the app currently fail silently on Safari.
**Why it happens:** WebKit Bug #198416 has been open since 2019. The feature exists in WebKit internals but is behind a flag never enabled by default.
**How to avoid:** Import `context-filter-polyfill` at app startup. It patches canvas drawing methods to apply filters via `getImageData` when native `ctx.filter` is unsupported.
**Warning signs:** Testing only on Chrome/Firefox. No Safari testing in CI or manual QA. Users on iOS/Safari reporting "sliders don't work."

### Pitfall 2: Sharpen Has No CSS Filter Equivalent
**What goes wrong:** Developer assumes `ctx.filter = "sharpen(N)"` exists by analogy with `blur()`. It does not. The filter string is silently ignored.
**Why it happens:** Blur is a CSS/Canvas filter function. Sharpen is a convolution operation with no CSS equivalent.
**How to avoid:** Implement sharpen as `getImageData` -> 3x3 kernel convolution -> `putImageData`. This is architecturally different from all other adjustments. Plan for it.
**Warning signs:** Code that sets `ctx.filter` to a string containing "sharpen".

### Pitfall 3: Blur Performance Freezes on Large Images
**What goes wrong:** Dragging the blur slider on a 4000x3000 image causes 500ms-2s UI freezes per tick.
**Why it happens:** Gaussian blur is O(n * r^2) where n = pixel count and r = radius. Existing adjustments (brightness, contrast, saturation) are O(n) with tiny constants because they're simple per-pixel multiplications.
**How to avoid:** Debounce blur slider at 150-200ms. Use local state for immediate slider visual feedback, debounced store update for pipeline re-render. Consider rendering at reduced resolution during drag for very large images.
**Warning signs:** Blur slider visibly stutters. Browser DevTools shows "Long Task" warnings.

### Pitfall 4: Sharpen Convolution Done In-Place
**What goes wrong:** Reading from and writing to the same `ImageData` buffer during convolution produces smeared, incorrect results. Pixels already modified affect neighboring pixel calculations.
**Why it happens:** Optimization attempt to avoid allocating a second buffer.
**How to avoid:** Always use separate source (`getImageData`) and destination (`createImageData`) buffers. Write to destination, then `putImageData` the destination.
**Warning signs:** Sharpen produces streaking or directional artifacts instead of uniform edge enhancement.

### Pitfall 5: Blur Bleeds Into Background Mask Edges
**What goes wrong:** With background removed + replacement color, blur causes the replacement color to bleed into subject edges because blur affects the entire canvas including transparent/replacement areas.
**Why it happens:** Blur is applied via `ctx.filter` during `drawImage`, which blurs the image before mask compositing. The blur radius extends into areas that will later be masked, creating soft edges.
**How to avoid:** The current pipeline order already handles this correctly: `ctx.filter` (including blur) is applied during `drawImage` of the SOURCE image, THEN the background mask is composited. Since blur only affects the source image draw, and masking happens after, the mask edges remain sharp. Verify this during testing.
**Warning signs:** Blurred subject has soft/feathered edges at the mask boundary when it should be sharp.

## Code Examples

### Example 1: Extended buildFilterString with blur
```typescript
// Source: Extension of existing buildFilterString in src/utils/canvas.ts
export function buildFilterString(adjustments: Adjustments): string {
  const parts: string[] = [];
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.greyscale) parts.push('grayscale(100%)');
  if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}
```

### Example 2: Updated Adjustments interface
```typescript
// Source: Extension of existing types/editor.ts
export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  greyscale: boolean;
  blur: number;     // 0-20 px radius
  sharpen: number;  // 0-100 intensity
}

export const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  greyscale: false,
  blur: 0,
  sharpen: 0,
};
```

### Example 3: Render pipeline with sharpen step
```typescript
// In renderToCanvas, after drawImage with ctx.filter, before mask compositing:
if (options.adjustments?.sharpen && options.adjustments.sharpen > 0) {
  applySharpen(ctx, options.adjustments.sharpen);
}
```

### Example 4: RenderOptions interface
```typescript
export interface RenderOptions {
  transforms: Transforms;
  adjustments?: Adjustments;
  crop?: CropRegion;
  backgroundMask?: ImageData | null;
  replacementColor?: string | null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ctx.filter` string (no Safari) | `context-filter-polyfill` for cross-browser | Polyfill available since 2020 | Makes `ctx.filter` work on Safari without code changes |
| Manual pixel loops for all filters | `ctx.filter` CSS string (GPU-accelerated) | Baseline 2024 (Sept 2024) | 10-100x faster for supported filters on Chrome/Firefox |
| SVG `feConvolveMatrix` for sharpen | `getImageData` convolution (simpler, Safari-safe) | N/A -- SVG approach was theoretical | Avoids `ctx.filter = "url(#id)"` which is also broken on Safari |
| `new CanvasFilter()` object API | `ctx.filter` CSS string syntax | String syntax is Baseline 2024; object API has no Safari support | CSS string is the correct choice |

**Deprecated/outdated:**
- `new CanvasFilter()` constructor: No Safari support as of March 2026. Do not use.
- CamanJS: Abandoned since 2013. All its effects are now native via `ctx.filter`.

## Open Questions

1. **Polyfill performance on large images in Safari**
   - What we know: `context-filter-polyfill` uses `getImageData`/`putImageData` internally for each draw call, which is slower than GPU-accelerated native `ctx.filter`.
   - What's unclear: How much slower on a 4000x3000 image. Is debouncing sufficient, or do we need reduced-resolution preview on Safari specifically?
   - Recommendation: Test with the polyfill on actual Safari hardware. Debouncing (already needed for blur) should cover it. If not, add Safari-specific reduced-resolution preview during drag.

2. **Edge pixel handling in sharpen convolution**
   - What we know: 3x3 kernel cannot be applied to border pixels (they lack neighbors).
   - What's unclear: Whether copying source border pixels is sufficient or if it creates a visible 1px border artifact.
   - Recommendation: Copy source pixels for borders (simplest). At typical image sizes, 1px border is invisible. Test and adjust if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | Blur filter string includes `blur(Npx)` when blur > 0 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "blur"` | Partially (buildFilterString tests exist, blur case needed) |
| FILT-01 | Blur slider debounces store updates | unit | `npx vitest run src/__tests__/adjustments.test.ts -t "debounce"` | No -- Wave 0 |
| FILT-02 | Sharpen convolution produces correct pixel values | unit | `npx vitest run src/__tests__/sharpen.test.ts` | No -- Wave 0 |
| FILT-02 | Sharpen with intensity 0 produces identity (no change) | unit | `npx vitest run src/__tests__/sharpen.test.ts -t "identity"` | No -- Wave 0 |
| FILT-02 | Sharpen clamps output to 0-255 range | unit | `npx vitest run src/__tests__/sharpen.test.ts -t "clamp"` | No -- Wave 0 |
| FILT-05 | Blur/sharpen defaults in store are 0 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "blur"` | No -- extend existing |
| COMPAT-01 | context-filter-polyfill imported at app startup | smoke | `npx vitest run src/__tests__/polyfill.test.ts` | No -- Wave 0 |
| Refactor | renderToCanvas options API -- existing tests pass with new signature | unit | `npx vitest run src/__tests__/canvas.test.ts` | Yes (must update) |
| Refactor | renderToCanvas options API -- all call sites compile | unit | `npx vitest run` | Yes (TypeScript compilation) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/sharpen.test.ts` -- covers FILT-02 convolution correctness
- [ ] `src/__tests__/canvas.test.ts` -- add blur filter string test cases (extend existing)
- [ ] `src/__tests__/canvas.test.ts` -- update all `renderToCanvas` calls to options API
- [ ] `src/__tests__/editorStore.test.ts` -- add blur/sharpen default and reset tests (extend existing)

## Sources

### Primary (HIGH confidence)
- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- CSS filter syntax, `blur()` function, Baseline 2024 status
- [Can I Use: CanvasRenderingContext2D.filter](https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter) -- Safari disabled through 26.4, 80.94% global support
- [WebKit Bug #198416](https://bugs.webkit.org/show_bug.cgi?id=198416) -- ctx.filter disabled in Safari, open since 2019
- [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) -- getImageData, putImageData, ImageData
- Existing codebase: `src/utils/canvas.ts`, `src/store/editorStore.ts`, `src/hooks/useRenderPipeline.ts`, `src/types/editor.ts`, `src/components/AdjustmentControls.tsx`, `src/utils/download.ts`

### Secondary (MEDIUM confidence)
- [context-filter-polyfill (GitHub)](https://github.com/davidenke/context-filter-polyfill) -- v0.3.14+, supports blur/brightness/contrast/saturate/grayscale/sepia/hue-rotate/invert/opacity, does NOT support `url()` references
- [web.dev: Image filters with canvas](https://web.dev/canvas-imagefilters/) -- Convolution kernel fundamentals, sharpen kernel `[0,-1,0,-1,5,-1,0,-1,0]`
- [Mozilla Bug #1498291](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291) -- CSS blur effects performance in canvas filters

### Tertiary (LOW confidence)
- [GitHub Gist: mikecao sharpen function](https://gist.github.com/mikecao/65d9fc92dc7197cb8a7c) -- Reference pixel-level sharpen implementation; math is standard, community source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- `ctx.filter` blur is MDN-documented Baseline 2024. Convolution kernel is textbook. Polyfill is actively maintained.
- Architecture: HIGH -- Research grounded in actual codebase files. Options refactor pattern is trivial. Sharpen insertion point in pipeline is clear.
- Pitfalls: HIGH -- Safari gap confirmed by Can I Use + WebKit bug tracker. Performance characteristics confirmed by Mozilla bug reports. Convolution correctness patterns are textbook.
- Safari fix: HIGH -- Polyfill verified to support all needed filter functions. Import-and-forget pattern confirmed.

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, 30-day validity)
