import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { TransformControls } from '../components/TransformControls';
import { DownloadPanel } from '../components/DownloadPanel';
import { useEditorStore } from '../store/editorStore';
import { defaultAdjustments } from '../types/editor';

// Mock Canvas and ZoomControls to avoid canvas/ResizeObserver APIs in jsdom
vi.mock('../components/Canvas', () => ({
  Canvas: () => null,
}));
vi.mock('../components/ZoomControls', () => ({
  ZoomControls: () => null,
}));

// Mock useBackgroundRemoval to avoid Web Worker creation in jsdom
vi.mock('../hooks/useBackgroundRemoval', () => ({
  useBackgroundRemoval: () => ({
    status: 'idle',
    downloadProgress: 0,
    error: null,
    modelCached: false,
    requestRemoval: vi.fn(),
    confirmDownload: vi.fn(),
    cancel: vi.fn(),
    restoreBackground: vi.fn(),
  }),
}));

describe('PrivacyBadge', () => {
  test('renders privacy text about photo never leaving the browser', () => {
    render(<PrivacyBadge />);
    expect(
      screen.getByText(/your photo never leaves this browser/i)
    ).toBeTruthy();
  });
});

describe('DownloadPanel', () => {
  const mockBitmap = { close: () => {}, width: 100, height: 200 } as unknown as ImageBitmap;

  beforeEach(() => {
    useEditorStore.setState({
      sourceImage: mockBitmap,
      originalFile: new File([''], 'test.jpg', { type: 'image/jpeg' }),
      wasDownscaled: false,
      transforms: { rotation: 0, freeRotation: 0, flipH: false, flipV: false },
      adjustments: { ...defaultAdjustments },
      cropRegion: null,
      cropMode: false,
      backgroundRemoved: false,
      backgroundMask: null,
      replacementColor: null,
    });
  });

  // EXPT-01: PNG button is promoted to primary when backgroundRemoved is true
  test('png_button_appears_first_with_primary_styling_when_background_removed', () => {
    useEditorStore.setState({ backgroundRemoved: true });
    render(<DownloadPanel />);

    const buttons = screen.getAllByRole('button');
    const pngButton = buttons.find(b => b.textContent?.includes('PNG'));
    const jpegButton = buttons.find(b => b.textContent?.includes('JPEG'));

    // PNG button must exist and appear before JPEG button in DOM order
    expect(pngButton).toBeTruthy();
    expect(jpegButton).toBeTruthy();

    const allButtons = Array.from(document.querySelectorAll('button'));
    const pngIndex = allButtons.findIndex(b => b.textContent?.includes('PNG'));
    const jpegIndex = allButtons.findIndex(b => b.textContent?.includes('JPEG'));
    expect(pngIndex).toBeLessThan(jpegIndex);

    // PNG button should have primary styling (bg-[#2A9D8F])
    expect(pngButton!.className).toContain('bg-[#2A9D8F]');
    // JPEG button should have outline styling (border-2 border-[#2A9D8F])
    expect(jpegButton!.className).toContain('border-2');
  });

  test('jpeg_button_appears_first_with_primary_styling_when_background_not_removed', () => {
    useEditorStore.setState({ backgroundRemoved: false });
    render(<DownloadPanel />);

    const allButtons = Array.from(document.querySelectorAll('button'));
    const pngIndex = allButtons.findIndex(b => b.textContent?.includes('PNG'));
    const jpegIndex = allButtons.findIndex(b => b.textContent?.includes('JPEG'));

    // JPEG appears before PNG when background is not removed
    expect(jpegIndex).toBeLessThan(pngIndex);

    const jpegButton = allButtons[jpegIndex];
    expect(jpegButton.className).toContain('bg-[#2A9D8F]');
  });

  // EXPT-03: Amber JPEG transparency warning visible when backgroundRemoved is true
  test('jpeg_transparency_warning_visible_when_background_removed', () => {
    useEditorStore.setState({ backgroundRemoved: true });
    render(<DownloadPanel />);

    expect(
      screen.getByText(/jpeg does not support transparency/i)
    ).toBeTruthy();
  });

  test('jpeg_transparency_warning_not_visible_when_background_not_removed', () => {
    useEditorStore.setState({ backgroundRemoved: false });
    render(<DownloadPanel />);

    expect(
      screen.queryByText(/jpeg does not support transparency/i)
    ).toBeNull();
  });
});

describe('TransformControls', () => {
  test('renders rotate left button', () => {
    render(<TransformControls />);
    expect(screen.getByLabelText(/rotate left/i)).toBeTruthy();
  });

  test('renders rotate right button', () => {
    render(<TransformControls />);
    expect(screen.getByLabelText(/rotate right/i)).toBeTruthy();
  });

  test('renders flip horizontal button', () => {
    render(<TransformControls />);
    expect(screen.getByLabelText(/flip horizontal/i)).toBeTruthy();
  });

  test('renders flip vertical button', () => {
    render(<TransformControls />);
    expect(screen.getByLabelText(/flip vertical/i)).toBeTruthy();
  });

  test('renders reset all button', () => {
    render(<TransformControls />);
    expect(screen.getByText(/reset all/i)).toBeTruthy();
  });
});

// ─── Gap 1: UI-TOPBAR ────────────────────────────────────────────────────────
describe('TopBar', () => {
  // Import inside describe to use mocked modules
  let TopBar: typeof import('../components/TopBar').TopBar;

  beforeEach(async () => {
    ({ TopBar } = await import('../components/TopBar'));
    useEditorStore.setState({ wasDownscaled: false, sourceImage: null });
  });

  test('topbar_renders_portfolio_apps_and_av_nav_links', () => {
    render(<TopBar />);
    expect(screen.getByText('Portfolio')).toBeTruthy();
    expect(screen.getByText('Apps')).toBeTruthy();
    expect(screen.getByText('A/V')).toBeTruthy();
  });

  test('topbar_renders_new_image_action_button', () => {
    render(<TopBar />);
    // "New Image" text is hidden on mobile via Tailwind but present in DOM
    expect(screen.getByTitle('New Image')).toBeTruthy();
  });

  test('topbar_renders_reset_all_action_button', () => {
    render(<TopBar />);
    expect(screen.getByTitle('Reset All')).toBeTruthy();
  });
});

// ─── Gap 2: UI-BOTTOMBAR ─────────────────────────────────────────────────────
describe('BottomBar', () => {
  let BottomBar: typeof import('../components/BottomBar').BottomBar;

  beforeEach(async () => {
    ({ BottomBar } = await import('../components/BottomBar'));
    useEditorStore.setState({ cropMode: false });
  });

  test('bottombar_renders_all_six_tab_labels', () => {
    render(<BottomBar />);
    // Labels exist in DOM even when hidden via md:block Tailwind class
    expect(screen.getByText('Crop')).toBeTruthy();
    expect(screen.getByText('Transform')).toBeTruthy();
    expect(screen.getByText('Adjustments')).toBeTruthy();
    expect(screen.getByText('Background')).toBeTruthy();
    expect(screen.getByText('Resize')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
  });
});

// ─── Gap 3: UI-PANELS ────────────────────────────────────────────────────────
describe('BottomBar panel toggle behavior', () => {
  let BottomBar: typeof import('../components/BottomBar').BottomBar;
  let AdjustmentControls: typeof import('../components/AdjustmentControls').AdjustmentControls;

  beforeEach(async () => {
    ({ BottomBar } = await import('../components/BottomBar'));
    ({ AdjustmentControls } = await import('../components/AdjustmentControls'));
    useEditorStore.setState({ cropMode: false });
  });

  test('clicking_adjustments_tab_opens_overlay_panel', () => {
    render(<BottomBar />);
    // OverlayPanel starts closed (opacity-0 / translate-y-full)
    // Find the Adjustments tab button and click it
    const adjustmentsBtn = screen.getByText('Adjustments').closest('button')!;
    expect(adjustmentsBtn).toBeTruthy();
    fireEvent.click(adjustmentsBtn);
    // After clicking, panel content (AdjustmentControls) should be in the DOM
    expect(screen.getByText('Brightness')).toBeTruthy();
  });

  test('clicking_active_tab_again_closes_the_panel', () => {
    render(<BottomBar />);
    const adjustmentsBtn = screen.getByText('Adjustments').closest('button')!;
    // Open the panel
    fireEvent.click(adjustmentsBtn);
    expect(screen.getByText('Brightness')).toBeTruthy();
    // Close by clicking the same tab again
    fireEvent.click(adjustmentsBtn);
    // After closing, Brightness should no longer be rendered (panel is null)
    expect(screen.queryByText('Brightness')).toBeNull();
  });

  test('clicking_different_tab_switches_panel_content', () => {
    render(<BottomBar />);
    const adjustmentsBtn = screen.getByText('Adjustments').closest('button')!;
    const downloadBtn = screen.getByText('Download').closest('button')!;
    // Open Adjustments panel
    fireEvent.click(adjustmentsBtn);
    expect(screen.getByText('Brightness')).toBeTruthy();
    // Switch to Download panel directly
    fireEvent.click(downloadBtn);
    // Adjustments content is gone, Download content appears
    expect(screen.queryByText('Brightness')).toBeNull();
    // DownloadPanel renders PNG and JPEG buttons
    expect(screen.getByText(/PNG/i)).toBeTruthy();
  });
});

// ─── Gap 4: UI-LAYOUT-REWIRE ─────────────────────────────────────────────────
describe('Editor layout', () => {
  let Editor: typeof import('../components/Editor').Editor;

  beforeEach(async () => {
    ({ Editor } = await import('../components/Editor'));
    useEditorStore.setState({ cropMode: false, sourceImage: null });
    // jsdom does not implement ResizeObserver — polyfill it for Editor tests
    if (!('ResizeObserver' in globalThis)) {
      (globalThis as Record<string, unknown>).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  });

  test('editor_renders_topbar_component', () => {
    render(<Editor />);
    // TopBar renders Portfolio/Apps/A/V links
    expect(screen.getByText('Portfolio')).toBeTruthy();
  });

  test('editor_renders_bottombar_component', () => {
    render(<Editor />);
    // BottomBar renders its 6 tabs
    expect(screen.getByText('Crop')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
  });

  test('editor_does_not_render_sidebar', () => {
    render(<Editor />);
    // Sidebar was deleted — no sidebar landmark or "sidebar" text
    expect(document.querySelector('[data-testid="sidebar"]')).toBeNull();
    // Sidebar had tool sections — verify none of the old sidebar-specific labels appear
    // The old Sidebar used "Crop", "Transform" etc as section headings — but those now only
    // appear in BottomBar tabs (which is the new design). We verify no <aside> element.
    expect(document.querySelector('aside')).toBeNull();
  });
});

// ─── Gap 5: UI-PANEL-CONTENT ─────────────────────────────────────────────────
describe('BottomBar panel content routing', () => {
  let BottomBar: typeof import('../components/BottomBar').BottomBar;

  beforeEach(async () => {
    ({ BottomBar } = await import('../components/BottomBar'));
    useEditorStore.setState({ cropMode: false, sourceImage: null });
  });

  test('adjustments_tab_renders_adjustment_controls', () => {
    render(<BottomBar />);
    fireEvent.click(screen.getByText('Adjustments').closest('button')!);
    // AdjustmentControls renders Brightness, Contrast, Saturation sliders
    expect(screen.getByText('Brightness')).toBeTruthy();
    expect(screen.getByText('Contrast')).toBeTruthy();
    expect(screen.getByText('Saturation')).toBeTruthy();
  });

  test('transform_tab_renders_transform_controls', () => {
    render(<BottomBar />);
    fireEvent.click(screen.getByText('Transform').closest('button')!);
    // TransformControls renders rotate/flip buttons
    expect(screen.getByLabelText(/rotate left/i)).toBeTruthy();
  });

  test('background_tab_renders_background_controls', () => {
    render(<BottomBar />);
    fireEvent.click(screen.getByText('Background').closest('button')!);
    // BackgroundControls in idle state renders "Remove Background" button
    expect(screen.getByText(/remove background/i)).toBeTruthy();
  });

  test('download_tab_renders_download_panel', () => {
    render(<BottomBar />);
    fireEvent.click(screen.getByText('Download').closest('button')!);
    // DownloadPanel renders PNG and JPEG buttons
    expect(screen.getByText(/PNG/)).toBeTruthy();
    expect(screen.getByText(/JPEG/)).toBeTruthy();
  });
});

// ─── Gap 6: UI-CROP-PANEL ────────────────────────────────────────────────────
describe('BottomBar crop tab enters crop mode', () => {
  let BottomBar: typeof import('../components/BottomBar').BottomBar;

  beforeEach(async () => {
    ({ BottomBar } = await import('../components/BottomBar'));
    // Reset store to known state with no active crop
    useEditorStore.setState({ cropMode: false, cropRegion: null });
  });

  test('clicking_crop_tab_calls_enterCropMode_in_store', () => {
    const enterCropModeSpy = vi.spyOn(useEditorStore.getState(), 'enterCropMode');
    render(<BottomBar />);
    const cropBtn = screen.getByText('Crop').closest('button')!;
    fireEvent.click(cropBtn);
    expect(enterCropModeSpy).toHaveBeenCalledOnce();
    enterCropModeSpy.mockRestore();
  });

  test('clicking_crop_tab_sets_cropMode_to_true_in_store', () => {
    render(<BottomBar />);
    expect(useEditorStore.getState().cropMode).toBe(false);
    const cropBtn = screen.getByText('Crop').closest('button')!;
    fireEvent.click(cropBtn);
    expect(useEditorStore.getState().cropMode).toBe(true);
  });
});
