import { describe, it, expect } from 'vitest';
import { formatPackDate } from './parseTime';

describe('formatPackDate utility', () => {
  it('should format a valid ISO string to "Month, Year" format', () => {
    const isoString = '2026-05-15T14:30:00.000Z';
    expect(formatPackDate(isoString)).toBe('May, 2026');
  });

  it('should return an empty string if falsy value is provided', () => {
    expect(formatPackDate(null)).toBe('');
    expect(formatPackDate(undefined)).toBe('');
    expect(formatPackDate('')).toBe('');
  });
});
