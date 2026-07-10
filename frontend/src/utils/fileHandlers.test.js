import { describe, it, expect, vi } from 'vitest';
import { handleFileSelect } from './fileHandlers';

describe('fileHandlers utility', () => {
  it('should read file and trigger cropper', () => {
    const setImageSrc = vi.fn();
    const setIsCropperOpen = vi.fn();

    const mockReader = {
      readAsDataURL: vi.fn(),
      result: null,
      onload: null
    };

    vi.stubGlobal('FileReader', vi.fn(function() {
      return mockReader;
    }));

    const file = new Blob(['content'], { type: 'image/png' });
    const event = { target: { files: [file] } };

    handleFileSelect(event, setImageSrc, setIsCropperOpen);

    expect(mockReader.readAsDataURL).toHaveBeenCalledWith(file);

    mockReader.result = 'data:image/png;base64,...';
    if (mockReader.onload) {
      mockReader.onload();
    }

    expect(setImageSrc).toHaveBeenCalledWith('data:image/png;base64,...');
    expect(setIsCropperOpen).toHaveBeenCalledWith(true);
  });
});
