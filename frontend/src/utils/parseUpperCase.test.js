import { describe, it, expect } from 'vitest';
import { parseUpperCase } from './parseUpperCase';

describe('parseUpperCase utility', () => {
  it('should capitalize the first letter and lowercase the rest', () => {
    expect(parseUpperCase('hELLo')).toBe('Hello');
    expect(parseUpperCase('WORLD')).toBe('World');
    expect(parseUpperCase('a')).toBe('A');
  });

  it('should handle already correctly formatted strings', () => {
    expect(parseUpperCase('Alias')).toBe('Alias');
  });
});
