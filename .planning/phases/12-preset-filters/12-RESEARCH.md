# Phase 12: Preset Filters - Research

**Researched:** 2026-03-14
**Domain:** CSS filter presets, Canvas 2D filter pipeline, Zustand state extension
**Confidence:** HIGH

## Summary

Phase 12 adds a visual grid of 8-10 named preset filters (sepia, vintage, warm, cool, B&W, fade, vivid, dramatic, film grain, matte) to the existing Adjustments panel. Each preset is a predefined set of CSS filter values (brightness, contrast, saturation, greyscale, sepia, hue-rotate) that maps directly to the existing `buildFilterString()` pipeline. The `context-filter-polyfill` imported in Phase 11 already ensures these CSS filters work on Safari.

**Critical requirement clarification:** FILT-04 states "Selecting a preset **overrides** manual adjustment values; 'None' preset restores defaults." The Out of Scope table in REQUIREMENTS.md explicitly lists "Preset filter composition with manual adjustments" as out of scope, noting "Override is simpler and more predictable." The phase description's success criteria #3 ("compose with manual adjustments without destroying manual values") contradicts the actual requirement. **The planner MUST follow FILT-04 and REQUIREMENTS.md: presets OVERRIDE manual values, they do not compose.** "None" restores `defaultAdjustments`.

The implementation is straightforward: define preset objects as `Partial<Adjustments>` plus additional CSS filter properties (sepia, hue-rotate) that require extending `buildFilterString()`. Add a `preset: string | null` field to the store. When a preset is selected, overwrite all adjustment values with preset values. When "None" is selected, reset to defaults. The visual grid uses small thumbnail previews rendered with CSS `filter` on a tiny sample of the loaded image.

**Primary recommendation:** Extend `Adjustments` and `buildFilterString()` with `sepia` and `hueRotate` fields. Define presets as named objects mapping to specific adjustment values. Add a preset grid UI to `AdjustmentControls.tsx`. Selecting a preset calls `setAdjustments(presetValues)` which overwrites all manual slider values. Exports already work because `renderToCanvas` uses `buildFilterString(adjustments)`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILT-03 | User can apply preset filters (sepia, vintage, warm, cool, B&W, fade, vivid, dramatic, film grain, matte) from a visual grid | Define ~10 presets as named `Adjustments` objects. Display in a grid with CSS-filtered thumbnail previews. Each preset maps to concrete `brightness`, `contrast`, `saturation`, `greyscale`, `sepia`, `hueRotate`, `blur` values. All use existing `ctx.filter` pipeline. |
| FILT-04 | Selecting a preset overrides manual adjustment values; "None" preset restores defaults | Store a `preset: string \| null` field. On preset select, call bulk `setAdjustments(presetValues)` to overwrite all sliders. "None" calls `setAdjustments(defaultAdjustments)`. Sliders update to reflect new values. User can further tweak sliders after preset (which clears the `preset` field to indicate custom state). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D `ctx.filter` | Baseline 2024 | Apply preset filter strings (sepia, hue-rotate, etc.) | Already used for brightness/contrast/saturation/blur. GPU-accelerated. Presets just set different values. |
| context-filter-polyfill | 0.3.14+ (already installed) | Safari compatibility for all CSS filters including sepia, hue-rotate | Already imported in Phase 11. Covers sepia() and hue-rotate() automatically. |
| Zustand | 5.x (existing) | Store preset selection and adjustment overrides | Extend existing store with `preset` field and bulk `setAdjustments` action. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.x (existing) | Test preset definitions, filter string generation, store behavior | Verify preset values produce correct CSS filter strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS filter presets | WebGL shader presets | Massive complexity increase, no benefit for the ~10 effects needed. CSS filters cover sepia, hue-rotate, brightness, contrast, saturation, grayscale, blur. |
| Thumbnail previews with CSS filter | Canvas-rendered thumbnails | CSS `filter` on `<img>` or `<canvas>` elements is simpler, faster, and uses the same filter syntax as the pipeline. No extra render calls needed. |
| Extending Adjustments interface | Separate PresetFilter type | Keeping everything in Adjustments means the pipeline needs zero changes. buildFilterString already handles arbitrary CSS filter properties. |

**Installation:**
```bash
# No new dependencies needed -- everything uses existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/editor.ts              # MODIFY: add sepia, hueRotate to Adjustments; add PresetFilter type
  utils/canvas.ts              # MODIFY: add sepia() and hue-rotate() to buildFilterString
  utils/presets.ts             # NEW: preset definitions (name, label, adjustment values, thumbnail CSS)
  store/editorStore.ts         # MODIFY: add preset field, setPreset action, bulk setAdjustments
  components/AdjustmentControls.tsx  # MODIFY: add preset grid above sliders
  components/PresetGrid.tsx    # NEW: visual grid of preset thumbnails with labels
```

### Pattern 1: Preset Definition as Adjustments Object

**What:** Each preset is a named object containing the full `Adjustments` values it applies.
**When to use:** All preset definitions.
**Example:**
```typescript
// Source: project architecture pattern
export interface PresetDefinition {
  id: string;
  label: string;
  adjustments: Adjustments;  // Complete set of values to apply
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'none',
    label: 'None',
    adjustments: { ...defaultAdjustments },
  },
  {
    id: 'sepia',
    label: 'Sepia',
    adjustments: {
      brightness: 100,
      contrast: 90,
      saturation: 60,
      greyscale: false,
      sepia: 80,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    adjustments: {
      brightness: 110,
      contrast: 85,
      saturation: 70,
      greyscale: false,
      sepia: 30,
      hueRotate: -10,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'warm',
    label: 'Warm',
    adjustments: {
      brightness: 105,
      contrast: 100,
      saturation: 110,
      greyscale: false,
      sepia: 20,
      hueRotate: 10,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'cool',
    label: 'Cool',
    adjustments: {
      brightness: 100,
      contrast: 105,
      saturation: 90,
      greyscale: false,
      sepia: 0,
      hueRotate: -20,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'bw',
    label: 'B&W',
    adjustments: {
      brightness: 105,
      contrast: 120,
      saturation: 100,
      greyscale: true,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'fade',
    label: 'Fade',
    adjustments: {
      brightness: 110,
      contrast: 80,
      saturation: 80,
      greyscale: false,
      sepia: 10,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'vivid',
    label: 'Vivid',
    adjustments: {
      brightness: 105,
      contrast: 130,
      saturation: 150,
      greyscale: false,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    adjustments: {
      brightness: 90,
      contrast: 150,
      saturation: 80,
      greyscale: false,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      sharpen: 10,
    },
  },
  {
    id: 'grain',
    label: 'Film Grain',
    adjustments: {
      brightness: 105,
      contrast: 110,
      saturation: 85,
      greyscale: false,
      sepia: 15,
      hueRotate: -5,
      blur: 0,
      sharpen: 30,
    },
  },
  {
    id: 'matte',
    label: 'Matte',
    adjustments: {
      brightness: 110,
      contrast: 75,
      saturation: 85,
      greyscale: false,
      sepia: 5,
      hueRotate: 0,
      blur: 0,
      sharpen: 0,
    },
  },
];
```

### Pattern 2: Override Behavior (FILT-04)

**What:** Selecting a preset replaces all adjustment values wholesale. Sliders update to reflect new values. User can tweak sliders after (clearing the preset indicator).
**When to use:** Every preset selection.
**Example:**
```typescript
// In editorStore.ts
setPreset: (presetId: string | null) => {
  if (presetId === null || presetId === 'none') {
    set({ adjustments: { ...defaultAdjustments }, activePreset: null });
  } else {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      set({ adjustments: { ...preset.adjustments }, activePreset: presetId });
    }
  }
},

// When user manually adjusts a slider after selecting a preset:
setAdjustment: (key, value) =>
  set((s) => ({
    adjustments: { ...s.adjustments, [key]: value },
    activePreset: null,  // Clear preset indicator since values are now custom
  })),
```

### Pattern 3: CSS Filter Thumbnail Previews

**What:** Each preset thumbnail shows a small version of the loaded image with the preset's CSS filter applied directly via the `style` attribute.
**When to use:** Preset grid rendering.
**Example:**
```typescript
// Generate a CSS filter string for preview thumbnails (same logic as buildFilterString)
function presetToCssFilter(adj: Adjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) parts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== 100) parts.push(`saturate(${adj.saturation}%)`);
  if (adj.greyscale) parts.push('grayscale(100%)');
  if (adj.sepia > 0) parts.push(`sepia(${adj.sepia}%)`);
  if (adj.hueRotate !== 0) parts.push(`hue-rotate(${adj.hueRotate}deg)`);
  if (adj.blur > 0) parts.push(`blur(${adj.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

// In PresetGrid component:
<div
  className="w-16 h-16 rounded-lg overflow-hidden"
  style={{ filter: presetToCssFilter(preset.adjustments) }}
>
  <img src={thumbnailUrl} className="w-full h-full object-cover" />
</div>
```

**Important:** CSS `filter` on HTML elements works in all browsers (including Safari) without the polyfill. The polyfill is only needed for Canvas 2D `ctx.filter`. So thumbnail previews work everywhere natively.

### Pattern 4: Thumbnail Generation from Source Image

**What:** Create a small object URL from the source image for use in preset grid thumbnails.
**When to use:** When source image is loaded or changes.
**Example:**
```typescript
// Create a small thumbnail URL from the source ImageBitmap
function createThumbnailUrl(source: ImageBitmap): string {
  const size = 64;
  const canvas = document.createElement('canvas');
  const aspect = source.width / source.height;
  canvas.width = aspect >= 1 ? size : Math.round(size * aspect);
  canvas.height = aspect >= 1 ? Math.round(size / aspect) : size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.6);
}
```

### Anti-Patterns to Avoid
- **Composing presets with manual adjustments:** FILT-04 and Out of Scope explicitly say override, not compose. Do not try to layer preset values on top of existing manual values.
- **Re-rendering canvas for each thumbnail:** Use CSS `filter` on `<img>` elements for previews. CSS filter on HTML elements is universally supported and GPU-accelerated. Only the main canvas needs `ctx.filter`.
- **Separate render path for presets:** Presets are just Adjustments values. The existing `buildFilterString() -> ctx.filter` pipeline handles everything. No new render logic needed.
- **Film grain via actual noise pixels:** True film grain would require `getImageData` pixel manipulation to add random noise. For a preset filter, approximate with slight sharpen + sepia + reduced contrast. Real grain is a future enhancement if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sepia effect | Manual pixel manipulation (R*0.393 + G*0.769 + ...) | `ctx.filter = "sepia(80%)"` via CSS filter | GPU-accelerated, one-line, handled by existing polyfill on Safari |
| Color temperature (warm/cool) | Manual channel shifting per pixel | `hue-rotate()` + `sepia()` + `saturate()` CSS filters | Combines standard CSS filter functions. No pixel manipulation needed. |
| B&W conversion | Manual luminance calculation per pixel | `ctx.filter = "grayscale(100%)"` (already exists) | Already implemented in buildFilterString. Just set `greyscale: true`. |
| Thumbnail filtering | Canvas re-render per preset | CSS `filter` on `<img>` element | Native browser CSS filtering is instant, no JavaScript needed per thumbnail |

**Key insight:** Every visual effect needed for preset filters maps to existing CSS filter functions (brightness, contrast, saturate, grayscale, sepia, hue-rotate, blur). The only code changes are: (1) add sepia/hueRotate to the Adjustments type, (2) add them to buildFilterString, (3) define preset value objects.

## Common Pitfalls

### Pitfall 1: Confusing Override vs. Compose Semantics
**What goes wrong:** Implementing presets that layer on top of manual adjustments instead of replacing them, creating confusing UX where the combined effect is unpredictable.
**Why it happens:** The phase description success criteria #3 says "compose" but FILT-04 and Out of Scope say "override."
**How to avoid:** Follow FILT-04: selecting a preset replaces ALL adjustment values. Sliders visually update to reflect preset values. User can tweak from there (which clears the active preset indicator).
**Warning signs:** Brightness slider at 150% + "Vivid" preset producing absurdly bright images.

### Pitfall 2: Thumbnail Previews Not Matching Canvas Output
**What goes wrong:** CSS `filter` on `<img>` produces slightly different color output than `ctx.filter` on canvas, causing user confusion when the selected preset looks different from the preview.
**Why it happens:** Browser rendering engines may have minor differences between CSS filter on DOM elements vs. canvas filter. Also, CSS filter for thumbnails is applied to the original image without transforms/crop/mask.
**How to avoid:** Accept minor differences as unavoidable. The thumbnail is an approximation. Keep the same filter value syntax for both paths to minimize discrepancy. The sharpen component of presets (which uses convolution, not CSS filter) will not be visible in CSS thumbnails -- this is acceptable since sharpen effects are subtle.
**Warning signs:** "Dramatic" preset thumbnail looks mild, but canvas version looks extreme.

### Pitfall 3: Forgetting to Extend buildFilterString for Sepia and Hue-Rotate
**What goes wrong:** Adding sepia and hueRotate to the Adjustments interface but forgetting to add them to `buildFilterString()`, resulting in presets that only apply brightness/contrast/saturation/greyscale/blur.
**Why it happens:** buildFilterString is the bottleneck where Adjustments values become CSS filter strings. New properties don't automatically appear in the output.
**How to avoid:** Add `if (adjustments.sepia > 0) parts.push(\`sepia(${adjustments.sepia}%)\`)` and `if (adjustments.hueRotate !== 0) parts.push(\`hue-rotate(${adjustments.hueRotate}deg)\`)` to buildFilterString. Add unit tests verifying these strings appear.
**Warning signs:** Sepia preset looks identical to "None".

### Pitfall 4: Reset/Clear Not Restoring Defaults for New Fields
**What goes wrong:** Adding sepia and hueRotate to Adjustments but forgetting to include them in `defaultAdjustments`, `resetAll()`, and `setImage()`. After reset, sepia/hueRotate retain their previous values.
**Why it happens:** Multiple places reference `defaultAdjustments` or reset adjustments. Easy to miss one.
**How to avoid:** Update `defaultAdjustments` in `types/editor.ts` to include `sepia: 0, hueRotate: 0`. All reset paths already spread `{ ...defaultAdjustments }` so they inherit new defaults automatically.
**Warning signs:** Loading a new image retains sepia tint from previous edit.

### Pitfall 5: Preset Grid Layout Breaking on Mobile
**What goes wrong:** 10 preset thumbnails in a grid overflow the OverlayPanel's max height on mobile, or thumbnails are too small to be useful.
**Why it happens:** The OverlayPanel has `max-h-[35vh]` on mobile. With sliders below the grid, space is tight.
**How to avoid:** Use a horizontally scrolling row for presets (not a grid). This fits naturally in the available width and leaves vertical space for sliders. Alternatively, put presets above sliders with a compact 2-row scrollable grid.
**Warning signs:** Preset grid pushes sliders off-screen. Thumbnails are 24px and unrecognizable.

## Code Examples

### Extended Adjustments Interface
```typescript
// Source: Extension of existing types/editor.ts
export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  greyscale: boolean;
  sepia: number;      // 0-100 percentage
  hueRotate: number;  // degrees, -180 to 180
  blur: number;       // 0-20 px radius
  sharpen: number;    // 0-100 intensity
}

export const defaultAdjustments: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  greyscale: false,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
  sharpen: 0,
};
```

### Extended buildFilterString
```typescript
// Source: Extension of existing src/utils/canvas.ts
export function buildFilterString(adjustments: Adjustments): string {
  const parts: string[] = [];
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.greyscale) parts.push('grayscale(100%)');
  if (adjustments.sepia > 0) parts.push(`sepia(${adjustments.sepia}%)`);
  if (adjustments.hueRotate !== 0) parts.push(`hue-rotate(${adjustments.hueRotate}deg)`);
  if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}
```

### Preset Grid Component (Compact)
```typescript
// Source: Project pattern - horizontal scrolling preset strip
interface PresetGridProps {
  thumbnailUrl: string | null;
  activePreset: string | null;
  onSelect: (presetId: string) => void;
}

export function PresetGrid({ thumbnailUrl, activePreset, onSelect }: PresetGridProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          className={`flex-shrink-0 flex flex-col items-center gap-1 ${
            activePreset === preset.id ? 'ring-2 ring-[#2A9D8F] rounded-lg' : ''
          }`}
        >
          <div
            className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-100"
            style={{
              filter: thumbnailUrl ? presetToCssFilter(preset.adjustments) : 'none',
            }}
          >
            {thumbnailUrl && (
              <img src={thumbnailUrl} className="w-full h-full object-cover" alt="" />
            )}
          </div>
          <span className="text-[10px] text-neutral-600 whitespace-nowrap">
            {preset.label}
          </span>
        </button>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-pixel manipulation for sepia/warm/cool | CSS `filter: sepia() hue-rotate()` | Baseline 2024 | GPU-accelerated, no pixel loops |
| Canvas-rendered filter previews | CSS `filter` on HTML `<img>` elements | Always available | Instant previews, no JS rendering |
| Complex filter composition/layering | Simple override semantics | Project decision | Simpler UX, predictable behavior |

**Deprecated/outdated:**
- CamanJS: Abandoned since 2013. All its preset effects are now native via CSS filters.
- Instagram-style filter libraries (CSSgram, etc.): Map to CSS filter strings. Can reference for preset values but no library needed.

## Open Questions

1. **Exact preset filter values**
   - What we know: The 10 preset names are specified in FILT-03. CSS filter functions (sepia, hue-rotate, brightness, contrast, saturate, grayscale, blur) can express all of them.
   - What's unclear: The exact numeric values for each preset are subjective. Values in this research are reasonable starting points based on common photo editing conventions.
   - Recommendation: Implement with the suggested values. They can be tuned visually during development. The architecture supports easy value changes since presets are just data objects.

2. **Film Grain preset fidelity**
   - What we know: Real film grain requires per-pixel noise overlay, which CSS filters cannot express. The "Film Grain" preset approximates the look with slight sharpen + sepia + adjusted contrast.
   - What's unclear: Whether users will find the approximation acceptable.
   - Recommendation: Use the CSS filter approximation. Real grain is a future enhancement (could use `getImageData` noise overlay). The preset name could be changed to "Film" if the grain effect is insufficient.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-03 | buildFilterString includes sepia() when sepia > 0 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "sepia"` | No -- extend existing |
| FILT-03 | buildFilterString includes hue-rotate() when hueRotate != 0 | unit | `npx vitest run src/__tests__/canvas.test.ts -t "hue-rotate"` | No -- extend existing |
| FILT-03 | All preset definitions produce valid non-empty filter strings (except "None") | unit | `npx vitest run src/__tests__/presets.test.ts` | No -- Wave 0 |
| FILT-03 | Preset definitions have unique ids and labels | unit | `npx vitest run src/__tests__/presets.test.ts -t "unique"` | No -- Wave 0 |
| FILT-04 | setPreset overrides all adjustment values with preset values | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No -- extend existing |
| FILT-04 | setPreset("none") restores defaultAdjustments | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No -- extend existing |
| FILT-04 | Manual slider adjustment after preset clears activePreset | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "preset"` | No -- extend existing |
| FILT-04 | defaultAdjustments includes sepia: 0 and hueRotate: 0 | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "default"` | Partially -- extend |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/presets.test.ts` -- covers FILT-03 preset definitions and filter string generation
- [ ] `src/__tests__/canvas.test.ts` -- add sepia and hue-rotate filter string tests (extend existing)
- [ ] `src/__tests__/editorStore.test.ts` -- add preset selection, override, and reset tests (extend existing)

## Sources

### Primary (HIGH confidence)
- [MDN: CSS filter functions](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) -- sepia(), hue-rotate(), and all other CSS filter functions. Supported in all modern browsers for HTML elements.
- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter) -- Same CSS filter syntax works on canvas. Baseline 2024. Safari gap covered by polyfill from Phase 11.
- Existing codebase: `src/utils/canvas.ts` (buildFilterString), `src/types/editor.ts` (Adjustments interface), `src/store/editorStore.ts` (setAdjustment), `src/components/AdjustmentControls.tsx` (slider UI), `src/components/BottomBar.tsx` (panel structure)
- REQUIREMENTS.md: FILT-03, FILT-04, and Out of Scope table confirming override (not compose) semantics

### Secondary (MEDIUM confidence)
- [context-filter-polyfill (GitHub)](https://github.com/davidenke/context-filter-polyfill) -- Supports sepia() and hue-rotate() in addition to filters already used. Already installed from Phase 11.
- CSS filter preset values: Based on common photo editing conventions and CSSgram-style filter recipes. Values are subjective but grounded in standard practice.

### Tertiary (LOW confidence)
- Film grain approximation via sharpen + sepia: This is an approximation. Real grain requires pixel-level noise. Flagged as potentially insufficient for user expectations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All preset effects use CSS filter functions already in the pipeline. Only need to add sepia() and hue-rotate() to buildFilterString.
- Architecture: HIGH -- Research grounded in actual codebase. Presets are data objects that map to existing Adjustments type. Pipeline needs no structural changes.
- Pitfalls: HIGH -- Override vs. compose conflict identified in requirements. Mobile layout constraint identified. All other pitfalls are straightforward.

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, 30-day validity)
