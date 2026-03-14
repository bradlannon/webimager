# Phase 2: Adjustments - Research

**Researched:** 2026-03-13
**Domain:** Canvas 2D filter API for image adjustments (brightness, contrast, saturation, greyscale)
**Confidence:** HIGH

## Summary

Phase 2 adds image adjustment controls (brightness, contrast, saturation sliders + greyscale toggle) to the existing editor. The implementation is straightforward because `CanvasRenderingContext2D.filter` accepts the same CSS filter function syntax used in stylesheets, and multiple filters compose naturally by concatenating them into a single string. This is a Baseline 2024 feature, supported across all modern browsers.

The existing non-destructive render pipeline (`renderToCanvas()` in `src/utils/canvas.ts`) already applies rotation/flip transforms before drawing. Adding adjustments requires: (1) extending the `Transforms` type with adjustment fields, (2) building a `ctx.filter` string from those fields before calling `ctx.drawImage()`, and (3) creating an `AdjustmentControls` component with sliders and a greyscale button in the sidebar.

**Primary recommendation:** Store adjustment values as numbers in the Zustand store (brightness/contrast/saturation as percentages with 100 as neutral, greyscale as boolean). Build the `ctx.filter` string in `renderToCanvas()` and set it before `drawImage()`. The existing `useRenderPipeline` hook will automatically re-render when adjustment state changes.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- no locked decisions in Phase 2 CONTEXT.md.

### Claude's Discretion
User gave full discretion on all adjustment UX decisions. Claude should make sensible choices for:
- Slider design (appearance, range, labels, value display)
- Default/neutral slider positions and step sizes
- Whether sliders have individual reset or rely on global "Reset all"
- Greyscale toggle design (button vs toggle switch)
- How greyscale interacts with brightness/contrast/saturation (can they be combined?)
- Ordering of controls in the Adjustments section
- Snap-to-default behavior on sliders

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADJT-01 | User can adjust brightness via slider with live preview | `ctx.filter = "brightness(X%)"` where 100% is neutral; slider range 0-200 with step 1 |
| ADJT-02 | User can adjust contrast via slider with live preview | `ctx.filter = "contrast(X%)"` where 100% is neutral; slider range 0-200 with step 1 |
| ADJT-03 | User can adjust saturation via slider with live preview | `ctx.filter = "saturate(X%)"` where 100% is neutral; slider range 0-200 with step 1 |
| ADJT-04 | User can convert image to greyscale with one click | `ctx.filter = "grayscale(100%)"` for full greyscale; toggle on/off |

</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework (slider components, state binding) | Already in project |
| Zustand | 5.x | State management (adjustment values) | Already in project |
| Tailwind CSS | 4.x | Slider styling, layout | Already in project |
| lucide-react | latest | Icons for greyscale button | Already in project |

### No New Libraries Needed
This phase requires zero new dependencies. Everything is built with:
- Native HTML `<input type="range">` for sliders
- `CanvasRenderingContext2D.filter` for image effects (browser API)
- Existing Zustand store pattern for state
- Existing render pipeline for live preview

## Architecture Patterns

### State Extension Pattern

Extend the existing `Transforms` type and store with adjustment fields. This follows the exact pattern established in Phase 1.

**Type extension** (`src/types/editor.ts`):
```typescript
export interface Adjustments {
  brightness: number;  // 0-200, default 100 (percentage)
  contrast: number;    // 0-200, default 100 (percentage)
  saturation: number;  // 0-200, default 100 (percentage)
  greyscale: boolean;  // false = off, true = full greyscale
}

export const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  greyscale: false,
};
```

**Store extension** (`src/store/editorStore.ts`):
```typescript
// Add to EditorStore interface:
adjustments: Adjustments;
setAdjustment: (key: keyof Omit<Adjustments, 'greyscale'>, value: number) => void;
toggleGreyscale: () => void;

// In resetAll: also reset adjustments to defaults
```

### Render Pipeline Extension Pattern

The `ctx.filter` property must be set BEFORE `ctx.drawImage()`. It applies to all subsequent draw operations until changed or the context is restored.

**Key implementation detail in `renderToCanvas()`:**
```typescript
// Source: MDN CanvasRenderingContext2D.filter
// Build filter string from adjustment values
function buildFilterString(adjustments: Adjustments): string {
  const filters: string[] = [];

  if (adjustments.brightness !== 100) {
    filters.push(`brightness(${adjustments.brightness}%)`);
  }
  if (adjustments.contrast !== 100) {
    filters.push(`contrast(${adjustments.contrast}%)`);
  }
  if (adjustments.saturation !== 100) {
    filters.push(`saturate(${adjustments.saturation}%)`);
  }
  if (adjustments.greyscale) {
    filters.push('grayscale(100%)');
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

// In renderToCanvas, before ctx.drawImage():
ctx.filter = buildFilterString(adjustments);
ctx.drawImage(source, -source.width / 2, -source.height / 2);
```

**Filter composition:** Multiple CSS filter functions are space-separated in a single string. The browser applies them in order. For these particular filters, order does not meaningfully affect the result (they are commutative for practical purposes).

### Component Structure

```
src/
  components/
    AdjustmentControls.tsx  # NEW: Sliders + greyscale button
  # All other existing files remain unchanged
```

The `AdjustmentControls` component slots into the existing `Sidebar.tsx` as a new `CollapsibleSection`:

```tsx
<CollapsibleSection title="Adjustments">
  <AdjustmentControls />
</CollapsibleSection>
```

### UX Recommendations (Claude's Discretion)

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Slider range | 0-200 for brightness/contrast/saturation | 100 = neutral; 0 = minimum; 200 = double. Wide enough for dramatic effect, not absurdly large |
| Step size | 1 | Fine-grained control, percentage-based |
| Default position | 100 (center of range) | Matches CSS filter neutral value |
| Value display | Show current percentage next to slider label | User needs feedback; e.g., "Brightness: 120%" |
| Individual reset | Double-click slider label to reset to 100 | Convenient per-control reset without cluttering UI |
| Greyscale design | Toggle button (not switch) | Matches the transform button pattern; "Greyscale" button that visually indicates active state |
| Greyscale + other adjustments | Allow combination | Greyscale + brightness/contrast adjustments is useful; saturation has no visible effect when greyscale is on, but no need to disable it |
| Control ordering | Brightness, Contrast, Saturation, then Greyscale button below | Standard order matching Photoshop/Lightroom conventions |
| Snap-to-default | No snap behavior on sliders | Keep it simple; double-click label handles reset |

### Anti-Patterns to Avoid
- **Setting `ctx.filter` after `drawImage()`:** The filter must be set BEFORE drawing. Setting it after has no effect on already-drawn content.
- **Forgetting to reset filter to `'none'`:** If `ctx.filter` is not restored, subsequent draw calls (like in download) will inherit stale filter values. Use `ctx.save()`/`ctx.restore()` which already wraps the existing render pipeline.
- **Using pixel manipulation (getImageData/putImageData) instead of ctx.filter:** Hand-rolling brightness/contrast with pixel loops is orders of magnitude slower and unnecessary. `ctx.filter` is GPU-accelerated.
- **Throttling/debouncing slider input events:** The render pipeline is fast enough (single `drawImage` with GPU filter). Throttling introduces visible lag. Use direct `onChange` binding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brightness adjustment | Manual pixel loop multiplying RGB values | `ctx.filter = "brightness(X%)"` | GPU-accelerated, handles edge cases, one line |
| Contrast adjustment | Manual pixel loop with contrast formula | `ctx.filter = "contrast(X%)"` | Same as above |
| Saturation adjustment | Manual HSL conversion per pixel | `ctx.filter = "saturate(X%)"` | HSL conversion is complex and slow per-pixel |
| Greyscale conversion | Manual luminance calculation (0.299R + 0.587G + 0.114B) | `ctx.filter = "grayscale(100%)"` | Browser handles ITU-R 601 weighting correctly |
| Custom slider component | Building from div + mouse/touch events | Native `<input type="range">` with Tailwind styling | Native handles keyboard, accessibility, touch; style with Tailwind `accent-color` and `appearance` |

**Key insight:** All four adjustments in this phase map directly to built-in CSS filter functions on the Canvas 2D context. There is zero reason to implement any of these manually.

## Common Pitfalls

### Pitfall 1: Filter Not Applied to Download Output
**What goes wrong:** Adjustments show in preview but downloaded image has no adjustments applied.
**Why it happens:** The `downloadImage()` function in `src/utils/download.ts` calls `renderToCanvas()` which currently does not apply filters. If adjustments are added to `renderToCanvas()` but the function signature is not updated to accept adjustment parameters, download uses default values.
**How to avoid:** Update `renderToCanvas()` to accept an `Adjustments` parameter. Update `downloadImage()` to pass current adjustments. Both preview and download must use the same render path.
**Warning signs:** Preview looks different from downloaded file.

### Pitfall 2: ctx.filter Persists Across Save/Restore Incorrectly
**What goes wrong:** Filter from a previous render leaks into the next render, causing double-application or stale filters.
**Why it happens:** `ctx.filter` is part of the context state saved/restored by `ctx.save()`/`ctx.restore()`. If the save/restore block is not structured correctly, the filter may persist.
**How to avoid:** Set `ctx.filter` AFTER `ctx.save()` and BEFORE `ctx.drawImage()`. The existing `ctx.restore()` will clean it up. This is already the correct pattern in the existing code.
**Warning signs:** Adjustments stack up each time the render fires.

### Pitfall 3: Slider Range Too Narrow or Too Wide
**What goes wrong:** Users cannot achieve desired effect (too narrow) or get unusable results (too wide, e.g., brightness 1000%).
**Why it happens:** Arbitrary range selection without testing.
**How to avoid:** Use 0-200 range with 100 as center. This maps to 0x to 2x multiplier, which covers practical use cases. Brightness 0% = black, 200% = very bright but not blown out.
**Warning signs:** Users drag slider to extreme and image becomes solid white/black with no useful range.

### Pitfall 4: Greyscale Toggle Resets Other Sliders
**What goes wrong:** Clicking greyscale resets brightness/contrast/saturation to defaults.
**Why it happens:** Implementing greyscale as a separate mode rather than an additive filter.
**How to avoid:** Greyscale is just another filter in the string. `ctx.filter = "brightness(120%) contrast(110%) grayscale(100%)"` works correctly -- brightness and contrast still apply to the greyscale image.
**Warning signs:** User adjusts brightness, clicks greyscale, brightness slider resets.

### Pitfall 5: Input Range Accessibility
**What goes wrong:** Screen readers cannot identify what each slider controls.
**Why it happens:** Missing `aria-label` or `<label>` association on range inputs.
**How to avoid:** Use `<label htmlFor="brightness">Brightness</label>` with matching `id` on the input, or `aria-label` on the input element.
**Warning signs:** Accessibility audit flags unlabeled form controls.

## Code Examples

### Building the Filter String
```typescript
// Source: MDN CanvasRenderingContext2D.filter
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter

// Multiple filters are space-separated, applied in order
ctx.filter = "brightness(120%) contrast(110%) saturate(80%) grayscale(100%)";
ctx.drawImage(source, 0, 0);

// Reset filter for subsequent operations
ctx.filter = "none";
```

### Updated renderToCanvas Signature
```typescript
// Extended to accept adjustments alongside transforms
export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: Transforms,
  adjustments: Adjustments  // NEW parameter
): void {
  const { rotation, flipH, flipV } = transforms;
  const isRotated90 = rotation === 90 || rotation === 270;
  const drawW = isRotated90 ? source.height : source.width;
  const drawH = isRotated90 ? source.width : source.height;

  ctx.canvas.width = drawW;
  ctx.canvas.height = drawH;
  ctx.save();
  ctx.translate(drawW / 2, drawH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

  // Apply adjustment filters before drawing
  ctx.filter = buildFilterString(adjustments);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}
```

### Slider Component Pattern
```tsx
// Native range input with Tailwind styling
<div className="flex flex-col gap-1">
  <div className="flex justify-between items-center">
    <label
      htmlFor="brightness"
      className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
      onDoubleClick={() => setAdjustment('brightness', 100)}
      title="Double-click to reset"
    >
      Brightness
    </label>
    <span className="text-xs text-neutral-500 dark:text-neutral-500 tabular-nums">
      {brightness}%
    </span>
  </div>
  <input
    id="brightness"
    type="range"
    min={0}
    max={200}
    step={1}
    value={brightness}
    onChange={(e) => setAdjustment('brightness', Number(e.target.value))}
    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer
      bg-neutral-200 dark:bg-neutral-600
      accent-blue-500 dark:accent-blue-400"
  />
</div>
```

### Greyscale Toggle Button
```tsx
<button
  type="button"
  onClick={toggleGreyscale}
  className={`
    flex items-center gap-2 w-full px-3 py-2 rounded text-sm
    transition-colors
    ${greyscale
      ? 'bg-blue-500 text-white'
      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
    }
  `}
>
  <Palette className="w-4 h-4" />
  Greyscale
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual pixel manipulation (getImageData loop) | `ctx.filter` CSS filter functions | Baseline Sept 2024 | GPU-accelerated, 100x+ faster, one-line implementation |
| External canvas filter libraries (fabric.js, CamanJS) | Native `ctx.filter` | ctx.filter baseline 2024 | No library needed for basic adjustments |
| Separate canvas per filter | Single `ctx.filter` string with multiple functions | Always supported this way | One draw call handles all adjustments |

**Deprecated/outdated:**
- **CamanJS**: Unmaintained since 2016, used pixel manipulation. `ctx.filter` replaces its core use case.
- **Manual pixel loops for brightness/contrast**: Still works but dramatically slower and unnecessary now that `ctx.filter` has full browser support.

## Open Questions

1. **Slider behavior on touch devices**
   - What we know: Native `<input type="range">` works on touch. The sidebar moves to bottom bar on mobile (existing Phase 1 layout).
   - What's unclear: Whether slider labels and value displays are readable at mobile sizes.
   - Recommendation: Use responsive text sizes. Test on narrow viewport during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already configured from Phase 1) |
| Config file | Already exists from Phase 1 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADJT-01 | setBrightness updates store; buildFilterString includes brightness | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "brightness"` | No -- Wave 0 |
| ADJT-02 | setContrast updates store; buildFilterString includes contrast | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "contrast"` | No -- Wave 0 |
| ADJT-03 | setSaturation updates store; buildFilterString includes saturate | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "saturation"` | No -- Wave 0 |
| ADJT-04 | toggleGreyscale updates store; buildFilterString includes grayscale | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "greyscale"` | No -- Wave 0 |
| Composition | buildFilterString combines all active adjustments | unit | `npx vitest run src/__tests__/canvas.test.ts -t "filter"` | No -- Wave 0 |
| Reset | resetAll resets adjustments to defaults | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "resetAll"` | Partially -- needs update |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/editorStore.test.ts` -- add tests for adjustment actions (setBrightness, setContrast, setSaturation, toggleGreyscale, resetAll with adjustments)
- [ ] `src/__tests__/canvas.test.ts` -- add tests for `buildFilterString()` (new file or extend existing)

## Sources

### Primary (HIGH confidence)
- [MDN - CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- filter syntax, supported functions, composition, Baseline 2024 status
- [MDN - CSS filter](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) -- brightness(), contrast(), saturate(), grayscale() function specs and neutral values
- Existing codebase (`src/utils/canvas.ts`, `src/store/editorStore.ts`, `src/types/editor.ts`) -- established patterns for extending the render pipeline

### Secondary (MEDIUM confidence)
- Phase 1 research (`01-RESEARCH.md`) -- architecture patterns, anti-patterns, established conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; ctx.filter is Baseline 2024
- Architecture: HIGH -- direct extension of existing patterns; minimal new code
- Pitfalls: HIGH -- well-understood domain; primary risk is filter-not-applied-to-download (easily prevented)
- UX decisions: MEDIUM -- reasonable defaults based on Photoshop/Lightroom conventions but untested at this scale

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, unlikely to change)
