import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordStep from './PasswordStep';

vi.mock('@/api/auth.js', () => ({
  useRegisterMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    setTokens: vi.fn(),
  }),
}));

describe('PasswordStep Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block the submit button when fields are empty', () => {
    render(<PasswordStep email="test@test.com" username="testuser" onBack={vi.fn()} onSuccess={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /Sign Up/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show a validation error (zod) if the password is too weak', async () => {
    const user = userEvent.setup();
    render(<PasswordStep email="test@test.com" username="testuser" onBack={vi.fn()} onSuccess={vi.fn()} />);

    const passwordInputs = screen.getAllByPlaceholderText('Enter your password');
    const mainPasswordInput = passwordInputs[0];

    await user.type(mainPasswordInput, 'weak');

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('should unlock the submit button if the passwords are valid and match', async () => {
    const user = userEvent.setup();
    render(<PasswordStep email="test@test.com" username="testuser" onBack={vi.fn()} onSuccess={vi.fn()} />);

    const passwordInputs = screen.getAllByPlaceholderText('Enter your password');
    const mainPasswordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    await user.type(mainPasswordInput, 'StrongPass123');
    await user.type(confirmPasswordInput, 'StrongPass123');

    const submitButton = screen.getByRole('button', { name: /Sign Up/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
