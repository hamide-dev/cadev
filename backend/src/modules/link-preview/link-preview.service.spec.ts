import { describe, expect, it } from 'vitest';
import { LinkPreviewService } from './link-preview.service.js';

describe('LinkPreviewService', () => {
  const service = new LinkPreviewService();

  it.each(['http://127.0.0.1/', 'http://localhost:3000/', 'http://10.0.0.5/', 'http://[::1]/', 'http://169.254.169.254/latest', 'ftp://example.com'])(
    'refuses %s',
    async (url) => {
      await expect(service.getPreview(url)).rejects.toThrow();
    },
  );
});
