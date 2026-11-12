import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Environment } from '../../../config/environment.js';

const OAUTH_PROVIDER_KEY = 'oauthProvider';

export const OAuthProvider = (provider: 'google' | 'github') =>
  SetMetadata(OAUTH_PROVIDER_KEY, provider);

@Injectable()
export class OAuthConfigurationGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const provider = this.reflector.get<'google' | 'github'>(
      OAUTH_PROVIDER_KEY,
      context.getHandler(),
    );
    const isConfigured =
      provider === 'google'
        ? this.config.get('GOOGLE_CLIENT_ID') &&
          this.config.get('GOOGLE_CLIENT_SECRET') &&
          this.config.get('GOOGLE_CALLBACK_URL')
        : this.config.get('GITHUB_CLIENT_ID') &&
          this.config.get('GITHUB_CLIENT_SECRET') &&
          this.config.get('GITHUB_CALLBACK_URL');
    if (!isConfigured) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_PROVIDER_NOT_CONFIGURED',
        message: 'This social sign-in provider is not configured.',
      });
    }
    return true;
  }
}
