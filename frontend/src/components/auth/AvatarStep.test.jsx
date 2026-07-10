import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarStep from './AvatarStep';

vi.mock('@/api/user.js', () => ({
  useUploadAvatarMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/modals/ImageCropperModal.jsx', () => ({
  default: () => <div data-testid="mock-cropper" />
}));

describe('AvatarStep Integration', () => {
  it('should change the Skip button to Finish when entering a nickname', async () => {
    const user = userEvent.setup();
    render(<AvatarStep onSuccess={vi.fn()} onBack={vi.fn()} />);

    const actionButton = screen.getByRole('button', { name: /Skip/i });
    expect(actionButton).toBeInTheDocument();

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');

    await user.type(nicknameInput, 'AliasPlayer');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Finish/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Skip/i })).not.toBeInTheDocument();
    });
  });
});
