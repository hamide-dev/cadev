import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Environment } from '../../config/environment.js';
import { SecurityModule } from '../../security/security.module.js';
import { GitHubOAuthStrategy } from '../../security/strategies/github-oauth.strategy.js';
import { GoogleOAuthStrategy } from '../../security/strategies/google-oauth.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { BrevoEmailService } from './infrastructure/brevo-email.service.js';
import { EmailVerificationEntity } from './infrastructure/email-verification.entity.js';
import { PendingRegistrationEntity } from './infrastructure/pending-registration.entity.js';
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
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // SMTP (local Mailpit or any relay) when SMTP_HOST is set, Brevo API otherwise.
    {
      provide: BrevoEmailService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        config.get('SMTP_HOST')
          ? new SmtpEmailService(config)
          : new BrevoEmailService(config),
    },
    OAuthConfigurationGuard,
    GoogleOAuthStrategy,
    GitHubOAuthStrategy,
  ],
})
export class AuthModule {}
