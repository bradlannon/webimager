import { describe, it, expect } from 'vitest';
import { dragDeltaToPercent, clampPosition, detectCenterSnap } from '../utils/text';

describe('dragDeltaToPercent', () => {
  it('converts positive delta to percentage', () => {
    expect(dragDeltaToPercent(50, 500)).toBe(10);
  });

  it('converts negative delta to negative percentage', () => {
    expect(dragDeltaToPercent(-30, 300)).toBe(-10);
  });

  it('returns 0 for zero delta', () => {
    expect(dragDeltaToPercent(0, 400)).toBe(0);
  });

  it('handles small container size', () => {
    expect(dragDeltaToPercent(25, 100)).toBe(25);
  });
});

describe('clampPosition', () => {
  it('passes through value within default range', () => {
    expect(clampPosition(50)).toBe(50);
  });

  it('clamps value below 0 to 0', () => {
    expect(clampPosition(-5)).toBe(0);
  });

  it('clamps value above 100 to 100', () => {
    expect(clampPosition(105)).toBe(100);
  });

  it('passes through exact boundary value 0', () => {
    expect(clampPosition(0)).toBe(0);
  });

  it('passes through exact boundary value 100', () => {
    expect(clampPosition(100)).toBe(100);
  });

  it('respects custom min/max range — within range', () => {
    expect(clampPosition(50, 10, 90)).toBe(50);
  });

  it('clamps to custom min', () => {
    expect(clampPosition(5, 10, 90)).toBe(10);
  });

  it('clamps to custom max', () => {
    expect(clampPosition(95, 10, 90)).toBe(90);
  });
});

describe('detectCenterSnap', () => {
  it('snaps when element center is exactly at 50%', () => {
    // position=49, elementSize=2 => center=50 => snapped, snapValue=50-1=49
    const result = detectCenterSnap(49, 2);
    expect(result.snapped).toBe(true);
    expect(result.snapValue).toBe(49);
  });

  it('does not snap when element center is far from 50%', () => {
    // position=40, elementSize=2 => center=41 => not near 50
    const result = detectCenterSnap(40, 2);
    expect(result.snapped).toBe(false);
    expect(result.snapValue).toBe(40);
  });

  it('snaps when center is within default 1.5% threshold', () => {
    // position=48, elementSize=2 => center=49 => |49-50|=1 <= 1.5 => snapped
    // snapValue = 50 - 2/2 = 49
    const result = detectCenterSnap(48, 2);
    expect(result.snapped).toBe(true);
    expect(result.snapValue).toBe(49);
  });

  it('does not snap when center is just outside default threshold', () => {
    // position=46, elementSize=2 => center=47 => |47-50|=3 > 1.5 => not snapped
    const result = detectCenterSnap(46, 2);
    expect(result.snapped).toBe(false);
    expect(result.snapValue).toBe(46);
  });

  it('snaps with custom threshold', () => {
    // position=48, elementSize=4 => center=50 => |50-50|=0 <= 2 => snapped
    // snapValue = 50 - 4/2 = 48
    const result = detectCenterSnap(48, 4, 2);
    expect(result.snapped).toBe(true);
    expect(result.snapValue).toBe(48);
  });

  it('does not snap with custom threshold when outside', () => {
    // position=44, elementSize=4 => center=46 => |46-50|=4 > 2 => not snapped
    const result = detectCenterSnap(44, 4, 2);
    expect(result.snapped).toBe(false);
    expect(result.snapValue).toBe(44);
  });

  it('handles large element size', () => {
    // position=40, elementSize=20 => center=50 => snapped
    // snapValue = 50 - 20/2 = 40
    const result = detectCenterSnap(40, 20);
    expect(result.snapped).toBe(true);
    expect(result.snapValue).toBe(40);
  });
});
