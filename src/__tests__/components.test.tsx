import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { TransformControls } from '../components/TransformControls';

describe('PrivacyBadge', () => {
  test('renders privacy text about photo never leaving the browser', () => {
    render(<PrivacyBadge />);
    expect(
      screen.getByText(/your photo never leaves this browser/i)
    ).toBeTruthy();
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
