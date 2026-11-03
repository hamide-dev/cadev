import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Environment } from '../../../config/environment.js';
import type { EmailVerificationPurpose } from './email-verification.entity.js';

// Used instead of Brevo when SMTP_HOST is set, e.g. the local Mailpit
// started by docker-compose.yml (SMTP on 1025, inbox on http://localhost:8025).
@Injectable()
export class SmtpEmailService {
  private readonly logger = new Logger(SmtpEmailService.name);

  constructor(private readonly config: ConfigService<Environment, true>) {}

  async sendVerificationCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose = 'registration',
  ): Promise<void> {
    const user = this.config.get('SMTP_USER');
    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_SECURE') ?? false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      ...(user ? { auth: { user, pass: this.config.get('SMTP_PASSWORD') } } : {}),
    });
    const purposeLabel =
      purpose === 'login' ? 'connexion' : 'confirmation de votre inscription';
    try {
      await transport.sendMail({
        from: {
          name: this.config.get('SMTP_FROM_NAME') ?? 'Hello World',
          address: this.config.get('SMTP_FROM_EMAIL'),
        },
        to: email,
        subject:
          purpose === 'login'
            ? 'Votre code de connexion Hello World'
            : 'Confirmez votre adresse e-mail',
        text: `Votre code à 4 chiffres pour ${purposeLabel} Hello World est ${code}. Il expire dans 10 minutes.`,
        html: `<p>Votre code à 4 chiffres pour ${purposeLabel} Hello World est <strong>${code}</strong>.</p><p>Il expire dans 10 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `SMTP rejected ${purpose} verification email (${error instanceof Error ? error.message : 'unknown error'}).`,
      );
      const responseCode =
        typeof error === 'object' && error !== null && 'responseCode' in error
          ? Number(error.responseCode)
          : undefined;
      if (responseCode === 535) {
        throw new ServiceUnavailableException({
          code: 'EMAIL_PROVIDER_AUTH_FAILED',
          message: 'The SMTP server rejected SMTP_USER / SMTP_PASSWORD.',
        });
      }
      throw new ServiceUnavailableException(
        {
          code: 'EMAIL_PROVIDER_UNAVAILABLE',
          message:
            'Could not reach the SMTP server. Check SMTP_HOST, SMTP_PORT and that it is running (docker compose up -d).',
        },
        { cause: error },
      );
    }
  }
}
