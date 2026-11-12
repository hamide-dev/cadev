import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Socket } from 'socket.io';
import type { Environment } from '../config/environment.js';

@Injectable()
export class FrontendApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const contextType = context.getType<'http' | 'ws' | 'rpc'>();

    // 1. Gestion des connexions et événements WebSocket (ex: Socket.IO /messaging)
    if (contextType === 'ws') {
      const client = context.switchToWs().getClient<Socket>();
      const expected = this.config.get('FRONTEND_API_KEY', { infer: true });

      // L'API key peut être transmise dans client.handshake.auth.apiKey ou dans les headers
      const provided =
        (typeof client?.handshake?.auth?.apiKey === 'string'
          ? client.handshake.auth.apiKey
          : null) ??
        (typeof client?.handshake?.headers?.['x-api-key'] === 'string'
          ? client.handshake.headers['x-api-key']
          : null);

      if (provided && apiKeysMatch(provided, expected)) {
        return true;
      }

      // Si le socket a déjà été validé avec succès par le middleware afterInit
      if (client?.data?.userId) {
        return true;
      }

      throw new ForbiddenException({
        code: 'API_KEY_INVALID',
        message: 'A valid application API key is required.',
      });
    }

    // 2. Gestion des contextes non-HTTP autres que ws (microservices / RPC)
    if (contextType !== 'http') {
      return true;
    }

    // 3. Gestion des requêtes HTTP REST
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      return true;
    }

    if (request.method === 'OPTIONS') {
      return true;
    }

    const path = request.path ?? request.url ?? '';

    // Les redirections OAuth et le probe de santé ne peuvent pas attacher d'en-têtes personnalisés
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

    // Si la route ne fait pas partie de l'API /api/v1/ (ex: swagger /api/docs)
    if (!path.startsWith('/api/v1/')) {
      return true;
    }

    const provided =
      (typeof request.header === 'function' ? request.header('x-api-key') : null) ??
      (typeof request.headers?.['x-api-key'] === 'string'
        ? request.headers['x-api-key']
        : null);

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
