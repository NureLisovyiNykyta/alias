import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLobby } from '@/contexts/LobbyContext.jsx';

vi.mock('@/contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/LobbyContext.jsx', () => ({
  useLobby: vi.fn(),
}));

vi.mock('@giphy/js-fetch-api', () => ({
  GiphyFetch: vi.fn().mockImplementation(function () {
    return {
      search: vi.fn(),
      trending: vi.fn(),
    };
  }),
}));

vi.mock('@giphy/react-components', () => ({
  Grid: () => <div data-testid="giphy-grid" />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }) => <div className={className}>{children}</div>,
    ul: ({ children, className }) => <ul className={className}>{children}</ul>,
    li: ({ children, className }) => <li className={className}>{children}</li>,
    span: ({ children, className }) => <span className={className}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Chat Component Integration', () => {
  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({ user: { id: 'user_1', nickname: 'TestUser' } });

    useLobby.mockReturnValue({
      sendMessage: mockSendMessage,
      chatMessages: {
        room: [
          {
            message_id: 'msg_1',
            content: 'Hello World!',
            sender_id: 'user_2',
            sender_nickname: 'Opponent',
          },
        ],
        team: [],
      },
    });

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('should render incoming messages correctly', () => {
    render(<Chat />);
    expect(screen.getByText('Hello World!')).toBeInTheDocument();
    expect(screen.getByText('Opponent')).toBeInTheDocument();
  });

  it('should send a text message when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Good game{enter}');

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'chat_message',
      payload: {
        target: 'room',
        content: 'Good game',
        message_type: 'text',
      },
    });

    expect(input.value).toBe('');
  });

  it('should automatically identify Giphy link formats and dispatch as a gif message', async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByPlaceholderText('Type a message...');
    const gifLink = 'https://media.giphy.com/media/test/giphy.gif';

    await user.type(input, gifLink);
    const sendButton = screen.getByRole('button', { name: /Send/i });
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'chat_message',
      payload: {
        target: 'room',
        content: '',
        message_type: 'gif',
        media_url: gifLink,
      },
    });
  });

  it('should not send empty messages', async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, '   {enter}');

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
