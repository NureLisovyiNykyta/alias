import { describe, it, expect } from 'vitest';
import { getCellGridStyle } from './getCellGridStyle';

describe('getCellGridStyle utility', () => {
  const MAX_ROW_WIDTH = 10;

  it('should correctly calculate coordinates for the first row (left to right)', () => {
    const pos0 = getCellGridStyle(0, MAX_ROW_WIDTH);
    expect(pos0).toEqual({ gridColumn: 1, gridRow: 1 });

    const pos9 = getCellGridStyle(9, MAX_ROW_WIDTH);
    expect(pos9).toEqual({ gridColumn: 10, gridRow: 1 });
  });

  it('should correctly calculate transition to the next row (edge cell)', () => {
    const pos10 = getCellGridStyle(10, MAX_ROW_WIDTH);
    expect(pos10).toEqual({ gridColumn: 10, gridRow: 2 });
  });

  it('should correctly calculate coordinates for the reverse row (right to left)', () => {
    const pos11 = getCellGridStyle(11, MAX_ROW_WIDTH);
    expect(pos11).toEqual({ gridColumn: 10, gridRow: 3 });

    const pos19 = getCellGridStyle(19, MAX_ROW_WIDTH);
    expect(pos19).toEqual({ gridColumn: 2, gridRow: 3 });
  });

  it('should correctly calculate downward transition on the left side', () => {
    const pos20 = getCellGridStyle(20, MAX_ROW_WIDTH);
    expect(pos20).toEqual({ gridColumn: 1, gridRow: 3 });
  });
});
