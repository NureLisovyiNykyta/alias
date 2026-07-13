import { describe, it, expect } from 'vitest';
import { extractAnchors } from './anchorExtractor';

describe('anchorExtractor utility', () => {
  it('should extract correct coordinates from scene children', () => {
    const mockScene = {
      traverse: (cb) => {
        cb({
          name: '1_pos1',
          getWorldPosition: () => ({ x: 1, y: 2, z: 3 }),
          position: { constructor: Object }
        });
      }
    };

    const anchors = extractAnchors(mockScene);

    expect(anchors[4]).toEqual([1, 2, 3]);
  });
});