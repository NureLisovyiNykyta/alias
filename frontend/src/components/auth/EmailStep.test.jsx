import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailStep from './EmailStep';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/api/auth.js', () => ({
  checkEmail: vi.fn(),
}));

const queryClient = new QueryClient();

describe('EmailStep Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <EmailStep onSuccess={vi.fn()} />
    </QueryClientProvider>
  );

  it('should block the submit button when the field is empty', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Check/i })).toBeDisabled();
  });

  it('should show an error when entering an invalid email', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByPlaceholderText('alias@gmail.com');
    await user.type(emailInput, 'invalid-email');

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should unlock the button with a valid email', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByPlaceholderText('alias@gmail.com');
    await user.type(emailInput, 'correct@email.com');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Check/i })).not.toBeDisabled();
    });
  });
});
