import { describe, it, expect } from 'vitest';
import { parseErrors } from './parseErrors';

describe('parseErrors utility', () => {
  it('should correctly parse an array of validation errors (FastAPI format)', () => {
    const errorData = {
      detail: [
        { loc: ['body', 'email_address'], msg: 'is invalid' },
        { loc: ['body', 'password'], msg: 'is too short' }
      ]
    };
    expect(parseErrors(errorData)).toBe('Email address is invalid, Password is too short');
  });

  it('should return the string directly if detail is a simple string', () => {
    const errorData = {
      detail: 'Invalid credentials'
    };
    expect(parseErrors(errorData)).toBe('Invalid credentials');
  });

  it('should return an empty string if errorData is missing or malformed', () => {
    expect(parseErrors(null)).toBe('');
    expect(parseErrors(undefined)).toBe('');
    expect(parseErrors({})).toBe('');
  });
});
