# Phase 1: Foundation - Research

**Researched:** 2026-03-13
**Domain:** Browser-based image editing (Canvas API, file I/O, transforms, non-destructive pipeline)
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire application skeleton: a Vite + React + TypeScript SPA with Tailwind CSS v4, a full-page drag-and-drop upload zone, a Canvas-based rendering pipeline, rotate/flip transforms, and JPEG/PNG download. The non-destructive render pipeline -- where all edits re-apply from the original source image -- is the architectural cornerstone that all future phases build on.

The key technical challenges are: (1) safely handling oversized images by downscaling before canvas rendering (Safari limits canvas to ~16.7M pixels), (2) correctly handling EXIF orientation so phone photos display upright, and (3) structuring state so transforms are parameters applied at render time, never mutating the source bitmap.

**Primary recommendation:** Use `createImageBitmap()` with `imageOrientation: "from-image"` (the default) for EXIF-corrected loading, downscale oversized images with a `limitSize()` utility before canvas allocation, and store all edits as a declarative state object that a single `renderPipeline()` function applies to produce the output canvas.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Landing page is a full-page drop zone -- "Drop your photo here or click to browse" IS the landing
- Drag feedback: dashed border changes color (e.g., blue highlight)
- Validation errors appear inline on the drop zone -- no popups or toasts
- When image is auto-downscaled for canvas safety, show a subtle info badge (not alarming)
- To upload a different image after editing, use a "New image" button in the toolbar (not drag-to-replace)
- Left sidebar with controls, image fills the right area (Photoshop-style)
- On mobile/narrow screens, sidebar moves to bottom bar
- Controls grouped into collapsible sections (Transform, Adjustments, Crop, etc.)
- Canvas background: checkerboard pattern (transparency indicator)
- Image always fits the canvas view -- no zoom controls in v1
- Reset: Single "Reset all" button that reverts to the original uploaded image
- After rotating, canvas resizes to fit the rotated image (no clipping)
- All transforms apply instantly -- no animations or transitions
- System-aware: follows OS dark/light mode preference

### Claude's Discretion
- Transform button design and grouping (icon buttons, dropdown, etc.)
- File info display placement (filename, dimensions)
- App branding (whether to show "WebImager" name, and where)
- Download flow (format picker, quality slider, filename behavior)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILE-01 | User can upload an image via drag-and-drop or file picker (JPEG, PNG, WebP) | HTML5 drag-and-drop API + hidden file input; accept attribute for format filtering |
| FILE-02 | Images exceeding safe canvas pixel limits are auto-downscaled on upload with notification | `limitSize()` utility targeting 16,777,216 pixel max (Safari limit); info badge UI |
| FILE-03 | EXIF orientation is auto-corrected on upload so photos display correctly | `createImageBitmap()` with default `imageOrientation: "from-image"` handles this natively |
| FILE-04 | User can download processed image as JPEG or PNG with quality slider | `canvas.toBlob()` with MIME type and quality param + `URL.createObjectURL()` for download |
| TRAN-02 | User can rotate image 90 degrees left or right | Rotation stored as state (0/90/180/270); applied via canvas transform in render pipeline |
| TRAN-03 | User can flip image horizontally or vertically | Flip stored as boolean flags; applied via canvas `scale(-1,1)` or `scale(1,-1)` |
| UX-01 | All effects render as live preview in real-time | Non-destructive pipeline re-renders from source on every state change |
| UX-02 | Privacy indicator shows users their photo never leaves the browser | Static UI element -- small lock icon + text in sidebar or toolbar |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Component model, hooks, ecosystem |
| TypeScript | 5.x | Type safety | Catches canvas API misuse, state shape errors |
| Vite | 6.x | Build tool / dev server | Fast HMR, first-class React+TS template, static deploy output |
| Tailwind CSS | 4.x | Utility-first styling | Zero-config with Vite plugin, dark mode via `prefers-color-scheme` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 5.x | State management | Editor state (transforms, image metadata, UI state) |
| lucide-react | latest | Icons | Rotate, flip, download, upload icons -- tree-shakeable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context + useReducer | Works for small state, but editor state will grow across phases; Zustand avoids re-render cascades and is simpler than Redux |
| Tailwind CSS | CSS Modules | Tailwind is faster for prototyping, has built-in dark mode, responsive utilities |
| lucide-react | heroicons | Either works; Lucide has broader icon set and consistent stroke style |

### No External Libraries Needed For
- **EXIF orientation**: `createImageBitmap()` handles this natively (baseline since Sept 2021)
- **Drag-and-drop**: HTML5 API is sufficient; no need for react-dropzone
- **Image downscaling**: Simple math utility + canvas drawImage
- **Download**: `canvas.toBlob()` + `URL.createObjectURL()` + anchor click

**Installation:**
```bash
npm create vite@latest webimager -- --template react-ts
cd webimager
npm install zustand lucide-react
npm install -D @tailwindcss/vite
```

**Tailwind v4 setup** (in `vite.config.ts`):
```typescript
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**CSS entry** (`src/index.css`):
```css
@import "tailwindcss";
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    DropZone.tsx          # Full-page upload landing
    Editor.tsx            # Main editor layout (sidebar + canvas)
    Canvas.tsx            # Canvas rendering component
    Sidebar.tsx           # Left sidebar / bottom bar
    TransformControls.tsx # Rotate/flip buttons
    DownloadPanel.tsx     # Format picker, quality slider, download button
    PrivacyBadge.tsx      # "Your photo never leaves this browser"
  hooks/
    useImageLoader.ts     # File reading, EXIF correction, downscaling
    useRenderPipeline.ts  # Applies transforms to source, draws to canvas
  store/
    editorStore.ts        # Zustand store for all editor state
  utils/
    canvas.ts             # limitSize(), drawCheckerboard(), etc.
    download.ts           # toBlob + download trigger
  types/
    editor.ts             # TypeScript types for state, transforms
  App.tsx
  main.tsx
  index.css
```

### Pattern 1: Non-Destructive Render Pipeline
**What:** All edits are stored as declarative parameters. A single `renderPipeline()` function reads the original source bitmap + current state and produces the output canvas. Nothing mutates the source.
**When to use:** Always -- this is the foundational pattern.
**Example:**
```typescript
// State shape (Zustand store)
interface EditorState {
  sourceImage: ImageBitmap | null;    // Original, EXIF-corrected
  originalFile: File | null;          // For filename, metadata
  wasDownscaled: boolean;             // Show info badge
  transforms: {
    rotation: 0 | 90 | 180 | 270;
    flipH: boolean;
    flipV: boolean;
  };
  // Future phases add: adjustments, crop, etc.
}

// Render pipeline (called on every state change)
function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  transforms: EditorState['transforms']
) {
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
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}
```

### Pattern 2: Image Loading Pipeline
**What:** File -> validate -> read as blob -> createImageBitmap (EXIF auto-correct) -> limitSize check -> downscale if needed -> store as sourceImage.
**When to use:** Every image upload.
**Example:**
```typescript
async function loadImage(file: File): Promise<{
  bitmap: ImageBitmap;
  wasDownscaled: boolean;
}> {
  // Validate format
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Unsupported format: ${file.type}`);
  }

  // createImageBitmap auto-corrects EXIF orientation (default: from-image)
  let bitmap = await createImageBitmap(file);

  // Check against Safari's canvas limit
  const MAX_PIXELS = 16_777_216; // Safari limit
  const pixels = bitmap.width * bitmap.height;
  let wasDownscaled = false;

  if (pixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / pixels);
    const newW = Math.floor(bitmap.width * scale);
    const newH = Math.floor(bitmap.height * scale);
    bitmap = await createImageBitmap(file, {
      resizeWidth: newW,
      resizeHeight: newH,
      resizeQuality: 'high',
    });
    wasDownscaled = true;
  }

  return { bitmap, wasDownscaled };
}
```

### Pattern 3: Download Pipeline
**What:** Render final state to an offscreen canvas, export via `toBlob()`, trigger download.
**Example:**
```typescript
function downloadImage(
  source: ImageBitmap,
  transforms: EditorState['transforms'],
  format: 'image/jpeg' | 'image/png',
  quality: number // 0-1, only affects JPEG
) {
  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d')!;
  renderToCanvas(ctx, source, transforms);

  offscreen.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited.${format === 'image/jpeg' ? 'jpg' : 'png'}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    format,
    format === 'image/jpeg' ? quality : undefined
  );
}
```

### Anti-Patterns to Avoid
- **Mutating source image:** Never apply transforms to the source bitmap itself. Always keep the original and re-render from it.
- **Using `toDataURL()` for downloads:** Use `toBlob()` instead -- data URLs have size limits and are slower for large images.
- **Canvas per transform:** Don't create a new canvas for each transform step. Use a single output canvas with stacked `ctx.transform()` calls.
- **Storing base64 in state:** Store the `ImageBitmap` reference, not a base64 string. Bitmaps are GPU-backed and far more efficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF orientation correction | Manual EXIF parsing + canvas rotation | `createImageBitmap()` default behavior | 8 EXIF orientation cases, edge cases with mirroring, all handled natively |
| State management with selective re-renders | React Context with manual memoization | Zustand selectors | Avoids re-render cascades as state grows across phases |
| Icon SVGs | Inline SVG components | lucide-react | Consistent sizing, stroke width, accessibility |
| Dark mode detection | Manual matchMedia listener | Tailwind `dark:` variant with `prefers-color-scheme` | Automatic, no JS needed |

**Key insight:** The browser's `createImageBitmap()` natively handles EXIF orientation -- this eliminates the need for libraries like `exifr` or `blueimp-load-image` for orientation correction. Those libraries are only needed if you want to read other EXIF data (GPS, camera model, etc.), which is out of scope.

## Common Pitfalls

### Pitfall 1: Canvas Memory Crash on iOS/Safari
**What goes wrong:** Creating a canvas with more than ~16.7M pixels silently fails -- drawing commands produce nothing, or the browser tab crashes.
**Why it happens:** Safari/WebKit has a hard limit of 16,777,216 total pixels (width x height). A 5000x4000 photo = 20M pixels, already over the limit.
**How to avoid:** Always run `limitSize()` before allocating the canvas. Use 16,777,216 as the safe maximum.
**Warning signs:** Blank canvas on iOS, no error thrown in console.

### Pitfall 2: Forgotten `e.preventDefault()` on Drag Events
**What goes wrong:** Browser navigates away from the app when a file is dropped, opening the image in a new tab.
**Why it happens:** Default browser behavior for file drops is to navigate to the file.
**How to avoid:** Call `e.preventDefault()` in both `onDragOver` and `onDrop` handlers. Also handle `onDragEnter`.
**Warning signs:** App disappears when dropping a file.

### Pitfall 3: Canvas Not Resizing After Rotation
**What goes wrong:** After 90-degree rotation, the image is clipped or has black bars because the canvas dimensions weren't swapped.
**Why it happens:** A 1920x1080 image rotated 90 degrees needs a 1080x1920 canvas.
**How to avoid:** Swap canvas width/height when rotation is 90 or 270 degrees (see render pipeline pattern above).
**Warning signs:** Image partially visible or surrounded by empty space after rotation.

### Pitfall 4: Memory Leaks with ImageBitmap and ObjectURLs
**What goes wrong:** Memory usage grows with each upload because old bitmaps and blob URLs aren't released.
**Why it happens:** `ImageBitmap` must be explicitly closed with `.close()`, and `URL.createObjectURL()` URLs must be revoked.
**How to avoid:** Call `oldBitmap.close()` when replacing the source image. Call `URL.revokeObjectURL(url)` after download link is clicked.
**Warning signs:** Growing memory in DevTools after multiple uploads.

### Pitfall 5: toBlob Quality Parameter Ignored for PNG
**What goes wrong:** Setting quality for PNG export has no effect -- PNG is always lossless.
**Why it happens:** The quality parameter only applies to lossy formats (JPEG, WebP).
**How to avoid:** Only show quality slider when JPEG is selected. Pass `undefined` for PNG quality.
**Warning signs:** User adjusts quality slider for PNG but file size doesn't change.

## Code Examples

### Checkerboard Background Pattern
```typescript
// Draw a checkerboard pattern for canvas background (transparency indicator)
function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tileSize = 8
) {
  const light = '#e5e5e5';
  const dark = '#cccccc';
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? light : dark;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
}
```

### Zustand Store Setup
```typescript
import { create } from 'zustand';

interface Transforms {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

interface EditorStore {
  // Image state
  sourceImage: ImageBitmap | null;
  originalFile: File | null;
  wasDownscaled: boolean;

  // Transform state
  transforms: Transforms;

  // Actions
  setImage: (bitmap: ImageBitmap, file: File, wasDownscaled: boolean) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  resetAll: () => void;
}

const defaultTransforms: Transforms = {
  rotation: 0,
  flipH: false,
  flipV: false,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  sourceImage: null,
  originalFile: null,
  wasDownscaled: false,
  transforms: { ...defaultTransforms },

  setImage: (bitmap, file, wasDownscaled) => {
    const old = get().sourceImage;
    if (old) old.close(); // Release previous bitmap
    set({
      sourceImage: bitmap,
      originalFile: file,
      wasDownscaled,
      transforms: { ...defaultTransforms },
    });
  },

  rotateLeft: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation - 90 + 360) % 360) as Transforms['rotation'],
      },
    })),

  rotateRight: () =>
    set((s) => ({
      transforms: {
        ...s.transforms,
        rotation: ((s.transforms.rotation + 90) % 360) as Transforms['rotation'],
      },
    })),

  flipHorizontal: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipH: !s.transforms.flipH },
    })),

  flipVertical: () =>
    set((s) => ({
      transforms: { ...s.transforms, flipV: !s.transforms.flipV },
    })),

  resetAll: () => set({ transforms: { ...defaultTransforms } }),
}));
```

### Responsive Sidebar Layout (Tailwind)
```tsx
// Sidebar on left for desktop, bottom bar for mobile
<div className="flex flex-col md:flex-row h-screen">
  {/* Canvas area -- fills available space */}
  <main className="flex-1 overflow-hidden bg-neutral-900">
    <Canvas />
  </main>

  {/* Sidebar: bottom on mobile, left on desktop */}
  <aside className="order-first md:order-none w-full md:w-64 md:h-full
    border-t md:border-t-0 md:border-r border-neutral-200 dark:border-neutral-700
    bg-white dark:bg-neutral-800 overflow-y-auto">
    <Sidebar />
  </aside>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual EXIF parsing (exif-js, blueimp) | `createImageBitmap()` auto-corrects EXIF | Baseline Sept 2021 | No library needed for orientation fix |
| `toDataURL()` for download | `toBlob()` + `URL.createObjectURL()` | Long available, now standard practice | Handles large images, no URL length limits |
| Tailwind v3 config file + PostCSS | Tailwind v4 Vite plugin, zero-config | Jan 2025 | Just `@import "tailwindcss"` in CSS |
| Redux for React state | Zustand 5.x | Zustand matured 2023-2024 | Minimal boilerplate, excellent TS support |
| CSS `image-orientation: from-image` | Default in all browsers | ~2020 onward | Browsers auto-rotate `<img>` tags; but canvas needs `createImageBitmap` |

**Deprecated/outdated:**
- **exif-js**: Unmaintained, no longer needed for orientation correction
- **Tailwind v3 setup**: Requires `tailwind.config.js` + PostCSS -- v4 is simpler
- **`canvas.toDataURL()`**: Still works but `toBlob()` is preferred for downloads

## Open Questions

1. **WebP download support**
   - What we know: `canvas.toBlob()` supports `image/webp` in Chrome/Firefox but not Safari
   - What's unclear: Whether Safari has added WebP toBlob support recently
   - Recommendation: Offer JPEG and PNG only in Phase 1 (per FILE-04 requirement). WebP can be added later with feature detection.

2. **OffscreenCanvas for performance**
   - What we know: `OffscreenCanvas` allows rendering off the main thread (Web Workers)
   - What's unclear: Whether it provides meaningful benefit for single-transform operations
   - Recommendation: Use standard canvas for Phase 1. OffscreenCanvas is an optimization for Phase 2+ if adjustment sliders cause jank.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (pairs with Vite) |
| Config file | `vitest.config.ts` (or inline in `vite.config.ts`) -- Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILE-01 | Upload accepts JPEG/PNG/WebP, rejects others | unit | `npx vitest run src/__tests__/imageLoader.test.ts -t "validates file type"` | No -- Wave 0 |
| FILE-02 | Oversized images are downscaled below 16.7M pixels | unit | `npx vitest run src/__tests__/imageLoader.test.ts -t "downscales oversized"` | No -- Wave 0 |
| FILE-03 | EXIF orientation corrected (via createImageBitmap) | integration | Manual -- requires real EXIF images in test fixtures | No -- Wave 0 |
| FILE-04 | Download produces valid JPEG/PNG with correct quality | unit | `npx vitest run src/__tests__/download.test.ts` | No -- Wave 0 |
| TRAN-02 | Rotate 90 left/right updates state and swaps dimensions | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "rotate"` | No -- Wave 0 |
| TRAN-03 | Flip H/V toggles state correctly | unit | `npx vitest run src/__tests__/editorStore.test.ts -t "flip"` | No -- Wave 0 |
| UX-01 | Render pipeline produces correct output for transform combos | unit | `npx vitest run src/__tests__/renderPipeline.test.ts` | No -- Wave 0 |
| UX-02 | Privacy badge renders | unit | `npx vitest run src/__tests__/components.test.ts -t "privacy"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` + `@testing-library/react` + `jsdom` -- dev dependencies to install
- [ ] `vitest.config.ts` or vitest config in `vite.config.ts` -- framework config
- [ ] `src/__tests__/editorStore.test.ts` -- covers TRAN-02, TRAN-03
- [ ] `src/__tests__/imageLoader.test.ts` -- covers FILE-01, FILE-02
- [ ] `src/__tests__/download.test.ts` -- covers FILE-04
- [ ] `src/__tests__/renderPipeline.test.ts` -- covers UX-01
- [ ] `src/__tests__/components.test.ts` -- covers UX-02
- [ ] Test fixture: EXIF-rotated JPEG for FILE-03 manual verification

## Sources

### Primary (HIGH confidence)
- [MDN - createImageBitmap()](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) -- imageOrientation options, EXIF handling, browser support
- [MDN - canvas.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) -- export formats, quality parameter
- [PQINA - Canvas area exceeds maximum limit](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/) -- Safari 16.7M pixel limit, limitSize() approach
- [Tailwind CSS v4 docs](https://tailwindcss.com/blog/tailwindcss-v4) -- Vite plugin setup, zero-config
- [Vite Getting Started](https://vite.dev/guide/) -- react-ts template

### Secondary (MEDIUM confidence)
- [canvas-size (GitHub)](https://github.com/jhildenbiddle/canvas-size) -- cross-browser canvas limit data (Chrome 268M, Firefox 472M, Safari 16.7M)
- [Zustand GitHub](https://github.com/pmndrs/zustand) -- API, TypeScript patterns
- [Lucide React](https://lucide.dev/guide/packages/lucide-react) -- usage, tree-shaking with Vite

### Tertiary (LOW confidence)
- Various Medium/DEV Community articles on Tailwind v4 + Vite setup (cross-verified with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Vite + React + TS + Tailwind v4 is well-documented, verified via official sources
- Architecture: HIGH -- Canvas 2D API is stable and well-understood; non-destructive pipeline is a standard pattern
- Pitfalls: HIGH -- Canvas limits, EXIF, drag-drop gotchas are well-documented across multiple authoritative sources
- EXIF handling: HIGH -- `createImageBitmap()` baseline since Sept 2021, verified via MDN

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, unlikely to change)
