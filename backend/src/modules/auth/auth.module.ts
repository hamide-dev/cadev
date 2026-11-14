import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { GitHubOAuthStrategy } from '../../security/strategies/github-oauth.strategy.js';
import { GoogleOAuthStrategy } from '../../security/strategies/google-oauth.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { AuthSessionService } from './application/auth-session.service.js';
import { EmailVerificationEntity } from './infrastructure/email-verification.entity.js';
import { PendingRegistrationEntity } from './infrastructure/pending-registration.entity.js';
import { RefreshSessionEntity } from './infrastructure/refresh-session.entity.js';
import { SmtpEmailService } from './infrastructure/smtp-email.service.js';
import { AuthController } from './presentation/auth.controller.js';
import { OAuthConfigurationGuard } from './presentation/oauth-configuration.guard.js';

@Module({
  imports: [
    UsersModule,
    SecurityModule,
    TypeOrmModule.forFeature([
      EmailVerificationEntity,
      PendingRegistrationEntity,
      RefreshSessionEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    SmtpEmailService,
    OAuthConfigurationGuard,
    GoogleOAuthStrategy,
    GitHubOAuthStrategy,
  ],
})
export class AuthModule {}
