import { describe, it, expect } from 'vitest';
import { parseImportedWords } from './parseImportedWords';

describe('parseImportedWords utility', () => {
  it('should parse a comma-separated string into an array of words', () => {
    const input = "apple, banana, cherry";
    expect(parseImportedWords(input)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('should trim whitespace from words', () => {
    const input = "  apple  ,  banana  ";
    expect(parseImportedWords(input)).toEqual(['apple', 'banana']);
  });

  it('should remove duplicates', () => {
    const input = "apple, apple, banana";
    expect(parseImportedWords(input)).toEqual(['apple', 'banana']);
  });

  it('should filter out empty strings', () => {
    const input = "apple,, banana, ,";
    expect(parseImportedWords(input)).toEqual(['apple', 'banana']);
  });

  it('should return an empty array for empty input', () => {
    expect(parseImportedWords("")).toEqual([]);
    expect(parseImportedWords(null)).toEqual([]);
  });
});
