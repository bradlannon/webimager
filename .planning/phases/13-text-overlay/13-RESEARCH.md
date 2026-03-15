# Phase 13: Text Overlay - Research

**Researched:** 2026-03-15
**Domain:** Canvas 2D text rendering, HTML overlay positioning, Zustand state management
**Confidence:** HIGH

## Summary

This phase adds text overlay capability to the editor: users add styled text via an HTML div overlay during editing, drag to position, and "Apply" bakes the text into the image via `ctx.fillText`. The architecture mirrors the existing CropOverlay pattern (dedicated mode with Apply/Cancel) and extends the BottomBar tab system.

The implementation is entirely achievable with existing dependencies (React, Zustand, Canvas 2D API). No new libraries are needed. The main complexity lies in coordinate mapping between the display-space HTML overlay and the source-pixel-space canvas for baking, especially when zoom/pan and crop are active. The CropOverlay already solves a similar coordinate mapping problem (percentage-based positioning over the canvas wrapper div), providing a direct reference.

**Primary recommendation:** Follow the CropOverlay component structure closely. Use percentage-based positioning for the text overlay div (relative to the canvas wrapper). On Apply, convert percentage position to source pixel coordinates and use `ctx.fillText` in `renderToCanvas`. Store baked text entries as an array in the Zustand store so they persist through re-renders and appear in exports.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Panel shows "Add Text" button initially; clicking it creates a text element centered on the visible canvas with placeholder text
- One text element at a time -- apply bakes it in, then user can add another
- No indication needed after applying -- canvas shows the baked text, consistent with crop behavior
- 5-8 curated system/web-safe fonts (e.g., sans-serif, serif, monospace, handwritten, display) -- Claude picks the specific set
- Bold and italic toggle buttons alongside font selection
- Text size via slider, range 12-120px -- consistent with existing adjustment slider pattern
- Color picker: row of 8-10 preset swatches (black, white, red, blue, etc.) plus hex input for custom colors
- New text placed at center of visible canvas area (accounts for zoom/pan)
- Snap-to-center guides: subtle guide lines appear when text aligns with horizontal or vertical image center
- Drag anywhere on the text element to reposition (no separate drag handle)
- Text constrained to image bounds -- cannot be dragged off-edge
- Dedicated mode with Apply/Cancel buttons on the canvas overlay, consistent with crop pattern
- Switching to another tab auto-discards unapplied text (user must explicitly Apply before switching)
- Reset All does NOT clear previously baked text -- once applied, text is permanent (consistent with resize behavior)
- Only baked text appears in exports -- unapplied text is a draft and won't be in downloads
- Architecture: HTML div overlay during editing, ctx.fillText on apply (bake)
- No Google Fonts, no rich text (stroke, shadow, curved), no multi-layer

### Claude's Discretion
- Specific font list curation (within 5-8 curated guideline)
- Text input method (inline on canvas vs panel text field -- Claude picks based on codebase patterns)
- Exact swatch colors for the color picker
- Text overlay visual design (border, handles, selection indicator)
- How text editing is triggered (double-click, single-click, etc.)
- Guide line visual style (color, opacity, dash pattern)

### Deferred Ideas (OUT OF SCOPE)
- Google Fonts support -- tracked as UX-03 in future requirements
- Rich text (stroke, shadow, curved text, multi-layer) -- Out of Scope table
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEXT-01 | User can add text with configurable font, size, and color | Font list curation, slider pattern from AdjustmentControls, color swatch + hex input pattern, store state fields |
| TEXT-02 | User can drag text to reposition on canvas | HTML div overlay with pointer events (CropOverlay pattern), percentage-based positioning, bounds clamping |
| TEXT-03 | Text remains editable until user clicks "Apply" | Dedicated text mode in store (like cropMode), Apply/Cancel overlay buttons, auto-discard on tab switch |
| TEXT-04 | Applied text is baked into image and included in exports | ctx.fillText in renderToCanvas pipeline, bakedTexts array in store, coordinate mapping from display-% to source-px |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component rendering, text overlay UI | Already in project |
| Zustand | 5.x | Text state management (draft + baked) | Already in project, store pattern established |
| Canvas 2D API | native | ctx.fillText for baking text into image | Zero dependencies, matches existing pipeline |
| lucide-react | 0.577.x | Icons for text tab, bold/italic toggles | Already in project |

### Supporting
No new libraries needed. All functionality uses browser-native APIs:
- `ctx.fillText()` / `ctx.measureText()` for baking
- Pointer Events API for drag (same as CropOverlay)
- CSS for overlay styling

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML div overlay | Canvas overlay (like drawing phase will use) | HTML is simpler for editable text, cursor, selection; canvas overlay better for freehand drawing |
| ctx.fillText | CanvasRenderingContext2D.strokeText | strokeText adds outlines -- out of scope per user decision |
| Fabric.js / Konva.js | Native canvas | Explicitly out of scope in REQUIREMENTS.md |

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    TextOverlay.tsx      # HTML overlay for editing (like CropOverlay)
    TextControls.tsx     # Panel content: font, size, color, bold, italic
  store/
    editorStore.ts       # Extended with text state + actions
  types/
    editor.ts            # Extended with TextEntry, TextStyle types
  utils/
    canvas.ts            # Extended renderToCanvas with text baking step
    text.ts              # (optional) Font list, coordinate mapping helpers
```

### Pattern 1: Text State in Zustand Store

**What:** Two distinct text state categories -- draft (currently being edited) and baked (permanently applied).
**When to use:** Always -- this is the core data model.

```typescript
// Types
interface TextStyle {
  fontFamily: string;
  fontSize: number;       // 12-120px
  color: string;          // hex string
  bold: boolean;
  italic: boolean;
}

interface TextEntry {
  content: string;
  x: number;              // percentage 0-100 of image width
  y: number;              // percentage 0-100 of image height
  style: TextStyle;
}

// Store additions
interface EditorStore {
  // ... existing fields ...

  // Text state
  textMode: boolean;                  // dedicated mode flag (like cropMode)
  draftText: TextEntry | null;        // currently editing, not yet baked
  bakedTexts: TextEntry[];            // permanently applied texts

  // Text actions
  enterTextMode: () => void;
  exitTextMode: () => void;
  setDraftText: (updates: Partial<TextEntry>) => void;
  setDraftStyle: (updates: Partial<TextStyle>) => void;
  applyText: () => void;             // bake draft into bakedTexts
  discardText: () => void;           // discard draft
}
```

### Pattern 2: HTML Overlay for Editing (TextOverlay Component)

**What:** An absolutely-positioned div inside the canvas wrapper div, matching CropOverlay's positioning strategy.
**When to use:** During textMode, rendered conditionally in Canvas.tsx.

Key design:
- The text overlay div is positioned using percentage-based `left`/`top` within the canvas wrapper (same coordinate space as CropOverlay)
- Drag uses Pointer Events with `setPointerCapture` (same as CropOverlay)
- Apply/Cancel buttons rendered in the overlay (same as crop's dedicated mode)
- Text content displayed as an HTML element (allows cursor, selection, natural font rendering during editing)

```typescript
// In Canvas.tsx, alongside CropOverlay:
{textMode && draftText && (
  <TextOverlay
    canvasRect={canvasRect}
    text={draftText}
    onTextChange={setDraftText}
    onStyleChange={setDraftStyle}
    onApply={applyText}
    onCancel={discardText}
  />
)}
```

### Pattern 3: Text Baking in Render Pipeline

**What:** After all other rendering steps (filters, sharpen, background mask), draw baked text entries using `ctx.fillText`.
**When to use:** In `renderToCanvas()` and by extension in download/export.

```typescript
// In renderToCanvas, after background mask/replacement color:
if (options.bakedTexts?.length) {
  for (const entry of options.bakedTexts) {
    ctx.save();
    const fontStyle = `${entry.style.italic ? 'italic ' : ''}${entry.style.bold ? 'bold ' : ''}`;
    // Scale font size from source-image-relative px to current canvas px
    const scaledSize = (entry.style.fontSize / sourceImageWidth) * ctx.canvas.width;
    ctx.font = `${fontStyle}${scaledSize}px ${entry.style.fontFamily}`;
    ctx.fillStyle = entry.style.color;
    ctx.textBaseline = 'top';
    // Convert percentage position to canvas pixels
    const px = (entry.x / 100) * ctx.canvas.width;
    const py = (entry.y / 100) * ctx.canvas.height;
    ctx.fillText(entry.content, px, py);
    ctx.restore();
  }
}
```

### Pattern 4: Tab Switch Auto-Discard

**What:** When user switches away from the Text tab, auto-discard unapplied text (unlike crop which auto-saves).
**When to use:** In BottomBar.tsx tab click handler.

```typescript
// In handleTabClick, before switching:
if (textMode) {
  discardText();  // auto-discard unapplied text
}
```

### Anti-Patterns to Avoid
- **Storing text as pixel coordinates:** Use percentage-based coordinates (0-100) like CropRegion. This ensures text position is independent of display size and works correctly during zoom/pan and export at full resolution.
- **Re-rendering baked text in the HTML overlay:** Once text is baked (Applied), it should only be rendered via `ctx.fillText` in the canvas pipeline. Never show applied text as HTML elements.
- **Making fontSize resolution-dependent:** Store fontSize relative to the source image dimensions. The same 48px text on a 1000px-wide image should look proportionally identical on a 4000px-wide image during export.
- **Modifying resetAll to clear bakedTexts:** Per user decision, Reset All does NOT clear previously baked text. bakedTexts should persist through resetAll.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font rendering | Custom glyph rendering | `ctx.fillText()` with CSS font strings | Browser handles kerning, ligatures, Unicode |
| Text measurement | Manual width calculation | `ctx.measureText()` | Accurate width for centering, bounds checking |
| Drag interaction | Custom mouse event tracking | Pointer Events + `setPointerCapture` | Already proven in CropOverlay, handles touch too |
| Color input | Custom color picker widget | HTML `<input>` for hex + swatch buttons | Simple, accessible, matches existing patterns |

## Common Pitfalls

### Pitfall 1: Font Size Scaling Between Display and Export
**What goes wrong:** Text appears correct on screen but is too small or too large in the exported image because display canvas and export canvas have different pixel dimensions.
**Why it happens:** fontSize is stored as absolute pixels but the display canvas is scaled to fit the viewport.
**How to avoid:** Store fontSize as a proportion of the source image width. When rendering (both display and export), compute the actual pixel size as `(proportionalSize * canvasWidth)`. The overlay HTML div should compute its CSS font-size from the display canvas dimensions.
**Warning signs:** Text looks different in download vs on screen.

### Pitfall 2: Coordinate Mapping with Crop Active
**What goes wrong:** Text position is wrong when image has an active crop region.
**Why it happens:** The percentage coordinates (0-100) refer to the post-crop image, but `renderToCanvas` draws text after crop is applied. Position must be relative to the cropped output, not the full source.
**How to avoid:** Always store text position as percentage of the final rendered output (post-crop). Since text is baked AFTER crop in the pipeline, this is the natural coordinate space.
**Warning signs:** Text appears offset when crop is active.

### Pitfall 3: Text Position Drift During Zoom/Pan
**What goes wrong:** Text overlay div drifts away from its intended canvas position when user zooms or pans.
**Why it happens:** The HTML overlay doesn't track the CSS transform applied to the canvas wrapper.
**How to avoid:** Position the TextOverlay INSIDE the same wrapper div that gets the zoom/pan transform (the `<div className="relative">` in Canvas.tsx). This way, the CSS transform applies equally to both the canvas and the text overlay.
**Warning signs:** Text moves relative to the image when zooming.

### Pitfall 4: Pointer Events Conflict with Pan/Zoom
**What goes wrong:** Dragging text also triggers canvas panning, or vice versa.
**Why it happens:** Both the text overlay and the container div listen for pointer events.
**How to avoid:** In text mode, the TextOverlay should `stopPropagation()` on pointer events (CropOverlay already does this). Additionally, disable panning when textMode is active (similar to how cropMode disables panning).
**Warning signs:** Text jumps or canvas pans while trying to drag text.

### Pitfall 5: Web-Safe Font Mismatch Between HTML and Canvas
**What goes wrong:** Text looks different in the HTML editing overlay vs the baked canvas result.
**Why it happens:** Different default font rendering between HTML and Canvas 2D, or font name strings don't match.
**How to avoid:** Use identical CSS font strings in both the HTML overlay and ctx.font. Test each curated font to ensure visual consistency. Use generic family names as fallbacks (e.g., `"Georgia, serif"`).
**Warning signs:** Font appears different after clicking Apply.

## Code Examples

### Curated Font List (Claude's Discretion)

Recommended 7 web-safe fonts covering common use cases:

```typescript
export const TEXT_FONTS = [
  { id: 'sans', label: 'Sans Serif', family: 'Arial, Helvetica, sans-serif' },
  { id: 'serif', label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Monospace', family: '"Courier New", Courier, monospace' },
  { id: 'display', label: 'Impact', family: 'Impact, "Arial Black", sans-serif' },
  { id: 'cursive', label: 'Cursive', family: '"Brush Script MT", "Comic Sans MS", cursive' },
  { id: 'rounded', label: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { id: 'narrow', label: 'Narrow', family: '"Arial Narrow", "Helvetica Condensed", sans-serif' },
] as const;
```

### Color Swatch Presets (Claude's Discretion)

```typescript
export const TEXT_COLORS = [
  '#000000', // black
  '#FFFFFF', // white
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
] as const;
```

### Baking Text into Canvas (renderToCanvas extension)

```typescript
// Add to RenderOptions type:
interface RenderOptions {
  // ... existing fields ...
  bakedTexts?: TextEntry[];
}

// Add at end of renderToCanvas, after background mask/replacement color:
if (options.bakedTexts?.length) {
  const outputW = ctx.canvas.width;
  const outputH = ctx.canvas.height;

  for (const entry of options.bakedTexts) {
    ctx.save();
    // Build font string
    const parts: string[] = [];
    if (entry.style.italic) parts.push('italic');
    if (entry.style.bold) parts.push('bold');
    // fontSize stored relative to source width; scale to output
    parts.push(`${entry.style.fontSize}px`);
    parts.push(entry.style.fontFamily);
    ctx.font = parts.join(' ');
    ctx.fillStyle = entry.style.color;
    ctx.textBaseline = 'top';

    // Convert percentage position to pixel position
    const px = (entry.x / 100) * outputW;
    const py = (entry.y / 100) * outputH;
    ctx.fillText(entry.content, px, py);
    ctx.restore();
  }
}
```

### Snap-to-Center Guide Detection

```typescript
function getSnapGuides(
  textX: number, textY: number,
  textWidth: number, textHeight: number,
  threshold: number = 1.5 // percentage threshold for snap
): { horizontal: boolean; vertical: boolean } {
  // Text center in percentage coordinates
  const centerX = textX + textWidth / 2;
  const centerY = textY + textHeight / 2;

  return {
    vertical: Math.abs(centerX - 50) < threshold,    // vertical center line
    horizontal: Math.abs(centerY - 50) < threshold,   // horizontal center line
  };
}
```

### Text Input Recommendation (Claude's Discretion)

**Recommendation: Panel text field (not inline on canvas).**

Rationale: The codebase uses `OverlayPanel` for all tab content. Placing a text input in the panel is consistent and avoids the complexity of inline canvas editing (contentEditable positioning, zoom-aware text sizing, mobile keyboard issues). The text overlay div on the canvas shows a preview of the text in real-time as the user types in the panel field.

### Integration Points Summary

1. **`editor.ts` types:** Add `TextEntry`, `TextStyle` interfaces and `bakedTexts` to `RenderOptions`
2. **`editorStore.ts`:** Add `textMode`, `draftText`, `bakedTexts` state + actions (`enterTextMode`, `exitTextMode`, `setDraftText`, `setDraftStyle`, `applyText`, `discardText`)
3. **`BottomBar.tsx`:** Add "Text" tab to tabs array, handle text mode enter/exit/auto-discard in `handleTabClick`, add `TextControls` to `PanelContent`
4. **`Canvas.tsx`:** Render `TextOverlay` conditionally when `textMode && draftText`, pass `canvasRect`
5. **`canvas.ts` / `renderToCanvas`:** Add text baking step after all other rendering, reading from `options.bakedTexts`
6. **`useRenderPipeline.ts`:** Subscribe to `bakedTexts` from store, pass to `renderToCanvas`
7. **`download.ts`:** Pass `bakedTexts` to `renderToCanvas` (via `downloadImage` parameter extension)
8. **`DownloadPanel.tsx`:** Pass `bakedTexts` from store to download function

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas libraries (Fabric.js, Konva) for text | Native Canvas 2D API + HTML overlay | Project decision | Zero dependencies, simpler, matches existing pipeline |
| Rich text editors on canvas | Simple fillText with font/size/color | Project decision | Avoids complexity, meets requirements |

## Open Questions

1. **Font size storage unit**
   - What we know: Font size slider is 12-120px. Display canvas is scaled to fit viewport. Export canvas is at source resolution.
   - What's unclear: Should fontSize be stored as absolute px (relative to source image dimensions), or as a percentage of image width?
   - Recommendation: Store as absolute px relative to source image post-crop dimensions. When rendering the display overlay, scale by `(displayCanvasWidth / sourceWidth)`. When baking via ctx.fillText, the stored px value maps directly to source pixels. This ensures WYSIWYG at all zoom levels and export sizes.

2. **Text measurement for bounds clamping**
   - What we know: Need to constrain text within image bounds during drag.
   - What's unclear: ctx.measureText in Canvas 2D gives width but height measurement is less reliable across browsers.
   - Recommendation: For bounds clamping during drag (HTML overlay), use the overlay div's `getBoundingClientRect()` for actual rendered dimensions. For canvas baking, use `ctx.measureText().width` and approximate height from fontSize.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @testing-library/react 16.x |
| Config file | vite.config.ts (vitest inline config) or vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEXT-01 | Text entry with font/size/color configurable | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "text"` | Needs extension |
| TEXT-02 | Text repositioning via drag | unit | `npx vitest run src/__tests__/textOverlay.test.ts` | Wave 0 |
| TEXT-03 | Text editable until Apply, discarded on tab switch | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "text"` | Needs extension |
| TEXT-04 | Baked text in canvas render and exports | unit | `npx vitest run src/__tests__/canvas.test.ts -t "text"` | Needs extension |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/editorStore.test.ts` -- extend with text mode, draft/bake, discard, resetAll-preserves-baked tests
- [ ] `src/__tests__/canvas.test.ts` -- extend with bakedTexts rendering test (ctx.fillText called with correct args)
- [ ] `src/__tests__/textOverlay.test.ts` -- new file for TextOverlay component: drag bounds, snap guides, Apply/Cancel

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: CropOverlay.tsx, Canvas.tsx, editorStore.ts, canvas.ts, BottomBar.tsx, editor.ts types
- Canvas 2D API: ctx.fillText, ctx.measureText, ctx.font -- browser-native, stable API
- CONTEXT.md: All user decisions and architectural choices

### Secondary (MEDIUM confidence)
- Web-safe font availability: Arial, Georgia, Courier New, Impact, Verdana are universally available across OS/browser combinations
- Brush Script MT availability on non-macOS: may need CSS cursive fallback

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all native APIs
- Architecture: HIGH -- directly follows established CropOverlay pattern with clear integration points
- Pitfalls: HIGH -- coordinate mapping and font scaling are well-understood problems; CropOverlay already solved the positioning pattern
- Font list: MEDIUM -- most fonts are universally available; Brush Script MT may vary on Linux

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain, no fast-moving dependencies)
