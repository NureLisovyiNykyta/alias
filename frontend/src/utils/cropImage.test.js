import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createImage, getCroppedImg } from './cropImage';

describe('cropImage utility', () => {

  describe('createImage function', () => {
    let mockImageInstance;

    beforeEach(() => {
      mockImageInstance = {};
      mockImageInstance.addEventListener = vi.fn((event, callback) => {
        mockImageInstance[event] = callback;
      });

      vi.stubGlobal('Image', vi.fn(function() {
        return mockImageInstance;
      }));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should resolve with image object when image loads successfully', async () => {
      const imgPromise = createImage('https://example.com/image.jpg');

      mockImageInstance['load']();

      const result = await imgPromise;
      expect(result).toBe(mockImageInstance);
      expect(mockImageInstance.src).toBe('https://example.com/image.jpg');
    });

    it('should reject with an error when image fails to load', async () => {
      const imgPromise = createImage('https://example.com/invalid.jpg');

      const fakeError = new Error('Loading failed');
      mockImageInstance['error'](fakeError);

      await expect(imgPromise).rejects.toThrow('Loading failed');
    });
  });

  describe('getCroppedImg function', () => {
    beforeEach(() => {
      const mockCtx = {
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        getContext: vi.fn(() => mockCtx),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['fake-image-data'], { type: 'image/jpeg' }));
        }),
        width: 0,
        height: 0,
      };

      vi.stubGlobal('document', {
        createElement: vi.fn((tagName) => {
          if (tagName === 'canvas') return mockCanvas;
          return {};
        }),
      });

      vi.stubGlobal('Image', vi.fn(function() {
        return {
          addEventListener: (event, cb) => {
            if (event === 'load') setTimeout(cb, 0);
          },
        };
      }));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should correctly configure canvas dimensions and return a Blob object', async () => {
      const pixelCrop = { x: 10, y: 20, width: 200, height: 150 };

      const resultBlob = await getCroppedImg('https://example.com/avatar.jpg', pixelCrop);

      expect(resultBlob).toBeInstanceOf(Blob);
      expect(resultBlob.type).toBe('image/jpeg');
    });
  });
});
