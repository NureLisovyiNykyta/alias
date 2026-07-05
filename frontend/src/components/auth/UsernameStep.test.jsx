import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsernameStep from './UsernameStep';

vi.mock('@/api/auth.js', () => ({
  useCheckUsernameMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('UsernameStep Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show an error if the username is shorter than 3 characters', async () => {
    const user = userEvent.setup();
    render(<UsernameStep onSuccess={vi.fn()} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('alias1836');
    await user.type(input, 'ab');

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters long')).toBeInTheDocument();
    });
  });

  it('should show an error when using prohibited characters', async () => {
    const user = userEvent.setup();
    render(<UsernameStep onSuccess={vi.fn()} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('alias1836');
    await user.type(input, 'User@Name!');

    await waitFor(() => {
      expect(screen.getByText('Only letters, numbers, and underscores are allowed')).toBeInTheDocument();
    });
  });
});
