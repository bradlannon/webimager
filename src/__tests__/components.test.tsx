import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { TransformControls } from '../components/TransformControls';
import { DownloadPanel } from '../components/DownloadPanel';
import { useEditorStore } from '../store/editorStore';
import { defaultAdjustments } from '../types/editor';

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
