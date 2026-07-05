import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PhaseAndTimer from './PhaseAndTimer';

vi.mock('@/contexts/UIContext.jsx', () => ({
  useUI: () => ({ isBoardOpen: false }),
}));

vi.mock('@/components/layouts/Digit.jsx', () => ({
  default: ({ value }) => <span data-testid="digit">{value}</span>,
}));

vi.mock('@/assets/info.svg', () => ({ default: 'info-icon.svg' }));

describe('PhaseAndTimer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should show the correct phase name', () => {
    const { rerender, container } = render(<PhaseAndTimer phase="PREPARE" />);
    expect(screen.getByText('Preparing')).toBeInTheDocument();

    rerender(<PhaseAndTimer phase="REVIEW" />);
    expect(screen.getByText('Reviewing results')).toBeInTheDocument();
  });

  it('should show 0:00 if the phase is not GUESSING', () => {
    const { container } = render(<PhaseAndTimer phase="PREPARE" endsAt={Date.now() / 1000 + 100} />);

    const timeText = Array.from(container.querySelectorAll('span')).map(el => el.textContent).join('');
    expect(timeText).toContain('0:00');
  });

  it('must keep time correctly during the GUESSING phase', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    vi.setSystemTime(now);

    const endsAt = Math.floor(now.getTime() / 1000) + 45;

    const { container } = render(<PhaseAndTimer phase="GUESSING" endsAt={endsAt} timeLimit={60} />);

    let timeText = Array.from(container.querySelectorAll('span')).map(el => el.textContent).join('');
    expect(timeText).toContain('0:45');

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    timeText = Array.from(container.querySelectorAll('span')).map(el => el.textContent).join('');
    expect(timeText).toContain('0:35');
  });

  it('must not exceed timeLimit', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    vi.setSystemTime(now);

    const endsAt = Math.floor(now.getTime() / 1000) + 100;

    const { container } = render(<PhaseAndTimer phase="GUESSING" endsAt={endsAt} timeLimit={60} />);

    const timeText = Array.from(container.querySelectorAll('span')).map(el => el.textContent).join('');
    expect(timeText).toContain('1:00');
  });

  it('should stop at 0:00 when time runs out', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    vi.setSystemTime(now);

    const endsAt = Math.floor(now.getTime() / 1000) + 5;

    const { container } = render(<PhaseAndTimer phase="GUESSING" endsAt={endsAt} timeLimit={60} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const timeText = Array.from(container.querySelectorAll('span')).map(el => el.textContent).join('');
    expect(timeText).toContain('0:00');
  });
});
