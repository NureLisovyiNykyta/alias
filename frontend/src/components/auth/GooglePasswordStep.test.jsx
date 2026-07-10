import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GooglePasswordStep from './GooglePasswordStep';

vi.mock('@/api/auth.js', () => ({
  useGoogleRegisterMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ setTokens: vi.fn() }),
}));

describe('GooglePasswordStep Integration', () => {
  it('should render the form and keep the button disabled by default', () => {
    render(<GooglePasswordStep googleToken="test" username="test" onSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeDisabled();
  });
});
