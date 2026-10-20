import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';
import type { Environment } from '../../config/environment.js';
import type { OAuthIdentity } from '../../modules/auth/domain/oauth-identity.js';
import { OAuthStateStore } from './oauth-state.store.js';

@Injectable()
export class GitHubOAuthStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService<Environment, true>) {
    const callbackURL =
      config.get('GITHUB_CALLBACK_URL') ??
      `http://localhost:${config.get('PORT', { infer: true })}/api/v1/auth/github/callback`;
    super({
      passReqToCallback: false,
      clientID:
        config.get('GITHUB_CLIENT_ID') ?? 'unconfigured-github-client-id',
      clientSecret:
        config.get('GITHUB_CLIENT_SECRET') ??
        'unconfigured-github-client-secret',
      callbackURL,
      scope: ['user:email'],
      store: new OAuthStateStore(
        'github',
        config.get('JWT_ACCESS_SECRET', { infer: true }),
        callbackURL,
      ),
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<OAuthIdentity> {
    let response: Response;
    try {
      response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'HelloWorldBackend',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        {
          code: 'OAUTH_PROVIDER_UNAVAILABLE',
          message: 'GitHub could not verify the account email.',
        },
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_PROVIDER_UNAVAILABLE',
        message: 'GitHub could not verify the account email.',
      });
    }
    const emails: unknown = await response.json();
    if (!Array.isArray(emails)) {
      throw new ServiceUnavailableException({
        code: 'OAUTH_PROVIDER_INVALID_RESPONSE',
        message: 'GitHub returned an invalid email response.',
      });
    }
    const primaryVerified = emails.find(
      (
        entry: unknown,
      ): entry is { email: string; primary: true; verified: true } =>
        isRecord(entry) &&
        typeof entry.email === 'string' &&
        entry.primary === true &&
        entry.verified === true,
    );
    if (!primaryVerified) {
      throw new UnauthorizedException({
        code: 'OAUTH_EMAIL_NOT_VERIFIED',
        message: 'A verified primary GitHub email address is required.',
      });
    }
    return {
      provider: 'github',
      providerId: profile.id,
      email: primaryVerified.email.trim().toLowerCase(),
      displayName:
        profile.displayName || profile.username || primaryVerified.email,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
