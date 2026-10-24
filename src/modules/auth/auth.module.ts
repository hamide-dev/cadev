import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { GitHubOAuthStrategy } from '../../security/strategies/github-oauth.strategy.js';
import { GoogleOAuthStrategy } from '../../security/strategies/google-oauth.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { BrevoEmailService } from './infrastructure/brevo-email.service.js';
import { EmailVerificationEntity } from './infrastructure/email-verification.entity.js';
import { PendingRegistrationEntity } from './infrastructure/pending-registration.entity.js';
import { AuthController } from './presentation/auth.controller.js';
import { OAuthConfigurationGuard } from './presentation/oauth-configuration.guard.js';

@Module({
  imports: [
    UsersModule,
    SecurityModule,
    TypeOrmModule.forFeature([
      EmailVerificationEntity,
      PendingRegistrationEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BrevoEmailService,
    OAuthConfigurationGuard,
    GoogleOAuthStrategy,
    GitHubOAuthStrategy,
  ],
})
export class AuthModule {}
