import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopScroller from './topScroller';

describe('TopScroller component', () => {
  it('should call window.scrollTo(0, 0) when rendered', () => {
    window.scrollTo = vi.fn();

    render(
      <MemoryRouter initialEntries={['/test-route']}>
        <TopScroller />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
