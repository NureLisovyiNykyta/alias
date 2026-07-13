import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordStep from './ResetPasswordStep';

describe('ResetPasswordStep Integration', () => {
  it('should unlock the button only with identical valid passwords', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordStep onSuccess={vi.fn()} onBack={vi.fn()} />);

    const passwordInputs = screen.getAllByPlaceholderText('Enter your password');
    const newPassword = passwordInputs[0];
    const confirmPassword = passwordInputs[1];
    const submitButton = screen.getByRole('button', { name: /Next step/i });

    await user.type(newPassword, 'Strong123');
    await user.type(confirmPassword, 'Strong321');

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    await user.clear(confirmPassword);
    await user.type(confirmPassword, 'Strong123');

    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });
});
