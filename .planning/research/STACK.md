# Technology Stack

**Project:** WebImager (browser-based image editor)
**Researched:** 2026-03-13

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | ~5.8 (stable) | Type-safe application code | TS 6.0 is RC as of March 2026 but too new for production use. 5.8/5.9 is battle-tested. Catches canvas API misuse at compile time. | HIGH |
| Vanilla TypeScript (no UI framework) | N/A | UI layer | This app is a single-view tool, not a multi-page SPA. The UI is mostly a canvas with some sliders and buttons. A framework like React/Svelte adds dependency weight and abstraction overhead for minimal benefit. Direct DOM manipulation with TypeScript is simpler, faster, and produces a smaller bundle. | HIGH |
| Vite | ^6.x | Build tool, dev server, bundler | Vite 8 just released (hours ago) and is too bleeding-edge. Vite 6.x is stable, fast, and well-documented. Handles TypeScript, CSS, HMR, and static site output out of the box. `vite build` produces optimized static assets ready for deployment. | HIGH |

**Why not React/Svelte/Preact?** This is a single-page tool with one view. The "components" are: a canvas, a toolbar, a few slider groups, and file upload/download buttons. Preact at 3KB is tempting, but vanilla TS is 0KB framework overhead and avoids any abstraction between your code and the Canvas API. The app state is simple: one image, some filter values, a crop rectangle. No routing, no complex component trees, no shared state across distant components. A framework would be overhead without payoff here.

### Image Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| HTML5 Canvas API | Native | Core image rendering and manipulation | Built into every browser. No dependency. Handles resize, rotate, flip, pixel manipulation, and filter application. The `CanvasRenderingContext2D.filter` property supports CSS-style filters (brightness, contrast, saturate, blur, grayscale, sepia) natively. | HIGH |
| Cropper.js | ^2.1.0 | Free-drag crop with selection rectangle | Purpose-built, well-maintained (last published ~4 months ago), 948+ npm dependents. Handles crop selection UI, aspect ratio lock, and touch support. v2 is ES module native with TypeScript types. Rolling your own crop selection UI is significant work for diminishing returns. | HIGH |

**Why not Fabric.js?** Fabric.js (v6.4.3) is a powerful canvas abstraction layer designed for design editors with objects, layers, text, and SVG import. It is 300KB+ and overkill for a photo editor that only needs pixel manipulation and basic transforms. WebImager does not need object management, drag-and-drop shapes, or SVG parsing. Using Canvas API directly is simpler and faster.

**Why not Konva.js?** Same reasoning as Fabric.js. Konva is for building interactive canvas apps with draggable nodes/shapes. WebImager manipulates pixels and applies filters to a single image. Direct Canvas API is the right level of abstraction.

**Why not a pre-built editor SDK (Filerobot, Pintura, Toast UI)?** These are complete editor UIs. Using one would mean WebImager is just a wrapper around someone else's editor. The project's value is building the editor itself. Pre-built SDKs also limit customization and add significant bundle weight.

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.2.0 | Utility-first styling | v4.2 (Feb 2026) is stable and mature. 5x faster builds than v3. CSS-native approach using `@property` and cascade layers. For a tool UI with sliders, buttons, panels, and responsive layout, Tailwind's utility classes eliminate the need for writing custom CSS files while keeping styles co-located with markup. | HIGH |

**Why not plain CSS?** This project has enough UI elements (toolbar, panels, sliders, buttons, modals for upload/download) that managing CSS files becomes tedious. Tailwind provides consistent spacing, colors, responsive utilities, and dark mode support without custom stylesheets.

**Why not a component library (DaisyUI, etc.)?** The UI needs are specific enough (image editor panels, crop overlays, filter sliders) that pre-built component styles would need heavy overriding. Tailwind utilities give full control with less friction.

### Performance Optimization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Web Workers | Native | Offload heavy pixel manipulation | For filter operations on large images (up to 10MB), pixel-level manipulation (brightness/contrast via ImageData) should run off the main thread to prevent UI freezing. Native browser API, no dependency. | MEDIUM |
| OffscreenCanvas | Native | Canvas operations in workers | Allows canvas rendering in Web Workers. Supported in Chrome, Edge, Safari, and Firefox (with minor differences). Used for filter previews and export rendering without blocking the main thread. | MEDIUM |

**MEDIUM confidence because:** For images under 10MB and CSS-style canvas filters (which are GPU-accelerated), Web Workers may be unnecessary for v1. The native `ctx.filter` property handles brightness/contrast/blur efficiently on the main thread. Workers become important for pixel-level ImageData manipulation (custom filters, color matrix transforms). Recommend starting without workers and adding them only if performance testing shows jank.

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^3.x | Unit testing | Native Vite integration, fast, TypeScript-first. Tests run in the same pipeline as the build. | HIGH |
| Playwright | ^1.50+ | E2E testing for canvas interactions | Can screenshot-compare canvas output. Handles file upload testing. Cross-browser. | MEDIUM |

### Code Quality

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.x | Linting | Flat config format is now standard. TypeScript-aware rules catch common mistakes. | HIGH |
| Prettier | ^3.x | Formatting | Consistent code style with zero debate. | HIGH |

## Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| file-saver | ^2.0.5 | Cross-browser file download | If `<a download>` has edge cases in target browsers. May not be needed. | LOW |
| browser-image-compression | ^2.0.2 | JPEG/PNG compression before download | If users want to control output file size/quality. Nice-to-have, not essential for v1. | LOW |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Framework | Vanilla TypeScript | React, Svelte, Preact | Single-view tool app. Framework adds weight and abstraction for no benefit. |
| Canvas Library | Native Canvas API | Fabric.js (v6.4.3) | Fabric is for design editors with objects/layers. 300KB+ for features we do not need. |
| Canvas Library | Native Canvas API | Konva.js | Built for draggable node graphs. Wrong abstraction for pixel manipulation. |
| Crop UI | Cropper.js (v2.1.0) | Custom implementation | Cropper.js handles edge cases (touch, aspect ratio, boundaries) that take weeks to get right. |
| Build Tool | Vite 6.x | Webpack, Parcel | Vite is faster, simpler config, native ES module dev server. Industry standard for new projects. |
| CSS | Tailwind v4.2 | Plain CSS, CSS Modules | Enough UI elements to benefit from utility classes. Tailwind v4 is CSS-native (no PostCSS plugin). |
| Editor SDK | Build our own | Filerobot, Pintura, Toast UI | Project goal IS building the editor. SDKs defeat the purpose. |
| TypeScript | 5.8 stable | TS 6.0 RC | 6.0 RC just announced March 6, 2026. Too new. 5.8/5.9 is production-ready. |

## Architecture Notes for Stack

**Canvas filter strategy (two tiers):**

1. **CSS-style filters** (brightness, contrast, saturate, blur, grayscale, sepia): Use `CanvasRenderingContext2D.filter` property. This is GPU-accelerated in modern browsers and applies instantly. Covers most of WebImager's filter needs.

2. **Pixel-level filters** (custom color adjustments, sharpen): Use `getImageData()` / `putImageData()` to manipulate pixel data directly. This is CPU-bound and slower on large images. Consider Web Workers for these operations if performance is an issue.

**File handling strategy:**
- Upload: `<input type="file" accept="image/*">` with FileReader API to load into an `<img>` element, then draw to canvas.
- Download: `canvas.toBlob()` for the processed image, then create a download link with `URL.createObjectURL()`.

**State management:**
- Plain TypeScript object holding current filter values, crop region, dimensions, and rotation state.
- No state library needed. The app has one image and one set of adjustments at a time.

## Installation

```bash
# Initialize project
npm create vite@latest webimager -- --template vanilla-ts

# Core dependencies
npm install cropperjs

# Styling
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D vitest @vitest/browser playwright eslint prettier
```

## Deployment

Static site output via `vite build` produces a `dist/` folder with:
- `index.html`
- Hashed JS/CSS bundles
- Zero server runtime required

Deploy to: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host.

## Sources

- [Cropper.js npm](https://www.npmjs.com/package/cropperjs) - v2.1.0, last published ~4 months ago
- [Cropper.js docs](https://fengyuanchen.github.io/cropperjs/)
- [Fabric.js npm](https://www.npmjs.com/package/fabric) - v6.4.3
- [Vite releases](https://vite.dev/releases) - v6.x stable line
- [Tailwind CSS v4.2](https://tailwindcss.com/blog/tailwindcss-v4) - Feb 2026 release
- [TypeScript 6.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/) - March 2026
- [CanvasRenderingContext2D.filter - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)
- [OffscreenCanvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Cloudinary JS image editor guide 2026](https://cloudinary.com/guides/image-effects/javascript-image-editor)
- [IMG.LY top 5 JS image manipulation libraries](https://img.ly/blog/the-top-5-open-source-javascript-image-manipulation-libraries/)
