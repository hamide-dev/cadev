import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import type { GitHubRepoPreview } from '../domain/github-preview.types.js';
import { GitHubRepoPreviewEntity } from '../infrastructure/github-repo-preview.entity.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const GITHUB_API_ROOT = 'https://api.github.com/repos/';

@Injectable()
export class GitHubPreviewService {
  constructor(
    @InjectRepository(GitHubRepoPreviewEntity)
    private readonly previews: Repository<GitHubRepoPreviewEntity>,
  ) {}

  async getPreview(submittedUrl: string): Promise<GitHubRepoPreview> {
    const { owner, name } = parseGitHubRepositoryUrl(submittedUrl);
    const fullName = `${owner}/${name}`.toLowerCase();
    const cached = await this.previews.findOneBy({ fullName });
    if (cached && cached.expiresAt.getTime() > Date.now()) {
      return toPublicPreview(cached);
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'HelloWorldBackend',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;

    let response: Response;
    try {
      response = await fetch(
        `${GITHUB_API_ROOT}${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
        { headers, signal: AbortSignal.timeout(5000) },
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        {
          code: 'GITHUB_API_UNAVAILABLE',
          message: 'GitHub could not be reached to load this repository.',
        },
        { cause: error },
      );
    }

    if (response.status === 304 && cached) {
      cached.fetchedAt = new Date();
      cached.expiresAt = new Date(Date.now() + CACHE_TTL_MS);
      return toPublicPreview(await this.previews.save(cached));
    }
    if (response.status === 404) {
      throw new NotFoundException({
        code: 'GITHUB_REPOSITORY_NOT_FOUND',
        message: 'The public GitHub repository was not found.',
      });
    }
    if (response.status === 403 || response.status === 429) {
      throw new ServiceUnavailableException({
        code: 'GITHUB_RATE_LIMITED',
        message: 'GitHub public API rate limit reached; retry later.',
      });
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'GITHUB_API_UNAVAILABLE',
        message: 'GitHub could not load this repository.',
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new ServiceUnavailableException(
        {
          code: 'GITHUB_API_INVALID_RESPONSE',
          message: 'GitHub returned invalid repository metadata.',
        },
        { cause: error },
      );
    }
    const repository = parseRepositoryPayload(payload, owner, name);
    const now = new Date();
    const entry = this.previews.create({
      ...repository,
      fullName,
      etag: response.headers.get('etag')?.slice(0, 255) ?? null,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    });
    await this.previews.upsert(entry, ['fullName']);
    const saved = await this.previews.findOneByOrFail({ fullName });
    return toPublicPreview(saved);
  }
}

function parseGitHubRepositoryUrl(value: string): {
  owner: string;
  name: string;
} {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidGitHubUrl();
  }
  if (
    url.protocol !== 'https:' ||
    (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw invalidGitHubUrl();
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) throw invalidGitHubUrl();
  const owner = segments[0]!;
  const rawName = segments[1]!;
  const name = rawName.toLowerCase().endsWith('.git')
    ? rawName.slice(0, -4)
    : rawName;
  if (
    !/^[A-Za-z0-9-]{1,39}$/.test(owner) ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(name) ||
    name === '.' ||
    name === '..'
  ) {
    throw invalidGitHubUrl();
  }
  return { owner, name };
}

function parseRepositoryPayload(
  value: unknown,
  requestedOwner: string,
  requestedName: string,
): Omit<GitHubRepoPreviewEntity, 'id' | 'etag' | 'fetchedAt' | 'expiresAt' | 'updatedAt'> {
  if (!isRecord(value) || !isRecord(value.owner)) {
    throw invalidGitHubResponse();
  }
  const owner = readString(value.owner, 'login');
  const name = readString(value, 'name');
  const descriptionValue = value.description;
  const languageValue = value.language;
  const stars = readCount(value, 'stargazers_count');
  const forks = readCount(value, 'forks_count');
  const openIssues = readCount(value, 'open_issues_count');
  const htmlUrl = readString(value, 'html_url');
  if (
    !owner ||
    !name ||
    owner.toLowerCase() !== requestedOwner.toLowerCase() ||
    name.toLowerCase() !== requestedName.toLowerCase() ||
    !htmlUrl.startsWith('https://github.com/') ||
    stars === null ||
    forks === null ||
    openIssues === null ||
    !(descriptionValue === null || typeof descriptionValue === 'string') ||
    !(languageValue === null || typeof languageValue === 'string')
  ) {
    throw invalidGitHubResponse();
  }
  return {
    owner,
    name,
    fullName: `${owner}/${name}`.toLowerCase(),
    description: descriptionValue,
    language: languageValue,
    stars,
    forks,
    openIssues,
    htmlUrl,
    ogImageUrl: createOgImageUrl(owner, name),
  };
}

function createOgImageUrl(owner: string, name: string): string {
  const key = createHash('sha256')
    .update(`${owner.toLowerCase()}/${name.toLowerCase()}`)
    .digest('hex')
    .slice(0, 20);
  return `https://opengraph.githubassets.com/${key}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function toPublicPreview(
  entity: GitHubRepoPreviewEntity,
): GitHubRepoPreview {
  return {
    owner: entity.owner,
    name: entity.name,
    fullName: entity.fullName,
    description: entity.description,
    language: entity.language,
    stars: entity.stars,
    forks: entity.forks,
    openIssues: entity.openIssues,
    htmlUrl: entity.htmlUrl,
    ogImageUrl: entity.ogImageUrl,
    fetchedAt: entity.fetchedAt.toISOString(),
    expiresAt: entity.expiresAt.toISOString(),
  };
}

function invalidGitHubUrl(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'INVALID_GITHUB_REPOSITORY_URL',
    message: 'Provide a valid HTTPS URL to a public github.com owner/repo.',
  });
}

function invalidGitHubResponse(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'GITHUB_API_INVALID_RESPONSE',
    message: 'GitHub returned invalid repository metadata.',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readCount(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}
