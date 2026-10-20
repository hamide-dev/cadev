import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import type { Environment } from '../../config/environment.js';
import type { OAuthIdentity } from '../../modules/auth/domain/oauth-identity.js';
import { OAuthStateStore } from './oauth-state.store.js';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Environment, true>) {
    const callbackURL =
      config.get('GOOGLE_CALLBACK_URL') ??
      `http://localhost:${config.get('PORT', { infer: true })}/api/v1/auth/google/callback`;
    super({
      passReqToCallback: false,
      clientID:
        config.get('GOOGLE_CLIENT_ID') ?? 'unconfigured-google-client-id',
      clientSecret:
        config.get('GOOGLE_CLIENT_SECRET') ??
        'unconfigured-google-client-secret',
      callbackURL,
      scope: ['email', 'profile'],
      store: new OAuthStateStore(
        'google',
        config.get('JWT_ACCESS_SECRET', { infer: true }),
        callbackURL,
      ),
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OAuthIdentity {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (profile._json.email_verified !== true || !email) {
      throw new UnauthorizedException({
        code: 'OAUTH_EMAIL_NOT_VERIFIED',
        message: 'A verified Google email address is required.',
      });
    }
    return {
      provider: 'google',
      providerId: profile.id,
      email,
      displayName: profile.displayName || email.split('@')[0]!,
    };
  }
}
