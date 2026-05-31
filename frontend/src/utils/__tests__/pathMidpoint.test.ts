import { describe, it, expect } from 'vitest';
import { pathMidpoint } from '../pathMidpoint';

describe('pathMidpoint', () => {
  it('2-point straight horizontal line', () => {
    const result = pathMidpoint([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    expect(result.mx).toBeCloseTo(50, 5);
    expect(result.my).toBeCloseTo(0, 5);
  });

  it('2-point diagonal line', () => {
    const result = pathMidpoint([{ x: 0, y: 0 }, { x: 100, y: 100 }]);
    expect(result.mx).toBeCloseTo(50, 5);
    expect(result.my).toBeCloseTo(50, 5);
  });

  it('3-point L-shape', () => {
    // pts: (0,0) -> (0,100) -> (100,100)
    // Total length: 100 + 100 = 200, half = 100
    // First segment 0,0 to 0,100 length 100 => midpoint exactly at (0,100)
    const result = pathMidpoint([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }]);
    expect(result.mx).toBeCloseTo(0, 5);
    expect(result.my).toBeCloseTo(100, 5);
  });

  it('3-point inverted L-shape', () => {
    // pts: (0,0) -> (100,0) -> (100,100)
    // Total length: 100 + 100 = 200, half = 100
    // First segment 0,0 to 100,0 length 100 => midpoint exactly at (100,0)
    const result = pathMidpoint([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
    expect(result.mx).toBeCloseTo(100, 5);
    expect(result.my).toBeCloseTo(0, 5);
  });

  it('4-point Z-shape', () => {
    // pts: (0,0) -> (0,100) -> (100,100) -> (100,200)
    // Total length: 100 + 100 + 100 = 300, half = 150
    // After 1st segment: accum=100 (<150)
    // 2nd segment: accum=100, segLen=100, 100+100>=150 => t=(150-100)/100=0.5
    // => x = 0 + 0.5 * (100-0) = 50, y = 100 + 0.5 * (100-100) = 100
    const result = pathMidpoint([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 200 }]);
    expect(result.mx).toBeCloseTo(50, 5);
    expect(result.my).toBeCloseTo(100, 5);
  });

  it('2-point vertical line', () => {
    const result = pathMidpoint([{ x: 50, y: 0 }, { x: 50, y: 200 }]);
    expect(result.mx).toBeCloseTo(50, 5);
    expect(result.my).toBeCloseTo(100, 5);
  });
});
