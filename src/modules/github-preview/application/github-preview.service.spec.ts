import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GitHubRepoPreviewEntity } from '../infrastructure/github-repo-preview.entity.js';
import { GitHubPreviewService } from './github-preview.service.js';

describe('GitHubPreviewService', () => {
  it('rejects non-GitHub URLs before accessing the cache or network', async () => {
    const previews = {
      findOneBy: vi.fn(),
    };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const testingModule = await Test.createTestingModule({
      providers: [
        GitHubPreviewService,
        {
          provide: getRepositoryToken(GitHubRepoPreviewEntity),
          useValue: previews,
        },
      ],
    }).compile();

    try {
      await expect(
        testingModule
          .get(GitHubPreviewService)
          .getPreview('https://example.com/owner/repo'),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_GITHUB_REPOSITORY_URL' },
      });
      expect(previews.findOneBy).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      await testingModule.close();
    }
  });
});
