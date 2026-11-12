import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Environment } from '../config/environment.js';

@Injectable()
export class FrontendApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;
    if (request.method === 'OPTIONS') return true;

    // OAuth redirects and the container's readiness probe cannot attach headers.
    if (
      request.method === 'GET' &&
      (path === '/api/v1' ||
        path === '/api/v1/' ||
        path === '/api/v1/health' ||
        path === '/api/v1/auth/google' ||
        path === '/api/v1/auth/google/callback' ||
        path === '/api/v1/auth/github' ||
        path === '/api/v1/auth/github/callback')
    ) {
      return true;
    }
    if (!path.startsWith('/api/v1/')) return true;

    const provided = request.header('x-api-key');
    const expected = this.config.get('FRONTEND_API_KEY', { infer: true });
    if (!provided || !apiKeysMatch(provided, expected)) {
      throw new ForbiddenException({
        code: 'API_KEY_INVALID',
        message: 'A valid application API key is required.',
      });
    }
    return true;
  }
}

export function apiKeysMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}
