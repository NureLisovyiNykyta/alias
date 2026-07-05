import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignIn from './SignIn';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Мокуємо API та контексти
vi.mock('@/api/auth.js', () => ({
  useLoginMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useGoogleLoginMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-mock" />,
}));

const queryClient = new QueryClient();

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SignIn Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate the button when valid data is entered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignIn />);

    const emailInput = screen.getByPlaceholderText('alias@gmail.com');
    const passwordInput = screen.getByPlaceholderText('Enter your password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
