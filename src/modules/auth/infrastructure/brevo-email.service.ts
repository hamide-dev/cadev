import {
  BrevoClient,
  BrevoError,
} from '@getbrevo/brevo';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import type { EmailVerificationPurpose } from './email-verification.entity.js';

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);

  constructor(private readonly config: ConfigService<Environment, true>) {}

  async sendVerificationCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose = 'registration',
  ): Promise<void> {
    const apiKey = this.config.get('BREVO_API_KEY');
    const senderEmail = this.config.get('BREVO_SENDER_EMAIL');
    if (!apiKey || !senderEmail) {
      this.logLocalError('Brevo email configuration is incomplete.');
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: 'Email verification is not configured on this server.',
      });
    }

    const purposeLabel =
      purpose === 'login' ? 'connexion' : 'confirmation de votre inscription';
    const client = new BrevoClient({ apiKey });
    try {
      await client.transactionalEmails.sendTransacEmail({
        sender: {
          name: this.config.get('BREVO_SENDER_NAME') ?? 'Hello World',
          email: senderEmail,
        },
        to: [{ email }],
        subject:
          purpose === 'login'
            ? 'Votre code de connexion Hello World'
            : 'Confirmez votre adresse e-mail',
        textContent: `Votre code à 4 chiffres pour ${purposeLabel} Hello World est ${code}. Il expire dans 10 minutes.`,
        htmlContent: `<p>Votre code à 4 chiffres pour ${purposeLabel} Hello World est <strong>${code}</strong>.</p><p>Il expire dans 10 minutes.</p>`,
      });
      this.logLocalDebug(`Brevo accepted ${purpose} verification email.`);
    } catch (error) {
      throw this.mapBrevoError(error, purpose);
    }
  }

  private mapBrevoError(
    error: unknown,
    purpose: EmailVerificationPurpose,
  ): ServiceUnavailableException {
    const statusCode = getBrevoStatusCode(error);
    this.logLocalError(
      `Brevo rejected ${purpose} verification email${statusCode ? ` with HTTP ${statusCode}` : ` (${errorName(error)})`}.`,
    );

    if (statusCode === 401) {
      return new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_AUTH_FAILED',
        message:
          'Brevo rejected BREVO_API_KEY. Verify that it is an active Brevo API key.',
      });
    }
    if (statusCode === 403) {
      return new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_IP_NOT_AUTHORIZED',
        message:
          'Brevo denied the API request. Check API-key permissions and authorize this backend’s public outbound IP in Brevo.',
      });
    }
    if (statusCode === 429) {
      return new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_RATE_LIMITED',
        message: 'Brevo email sending is temporarily rate limited.',
      });
    }
    if (statusCode === 400 || statusCode === 422) {
      return new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_SENDER_INVALID',
        message:
          'Brevo rejected the email data. Verify that BREVO_SENDER_EMAIL is a validated sender in this Brevo account.',
      });
    }
    if (statusCode === undefined || statusCode >= 500) {
      return new ServiceUnavailableException(
        {
          code: 'EMAIL_PROVIDER_UNAVAILABLE',
          message: 'Brevo could not process the email request. Try again later.',
        },
        { cause: error },
      );
    }
    return new ServiceUnavailableException({
      code: 'EMAIL_PROVIDER_SEND_FAILED',
      message: `Brevo could not send the verification email (HTTP ${statusCode}).`,
    });
  }

  private logLocalDebug(message: string): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'development') {
      this.logger.debug(message);
    }
  }

  private logLocalError(message: string): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'development') {
      this.logger.error(message);
    }
  }
}

function getBrevoStatusCode(error: unknown): number | undefined {
  if (error instanceof BrevoError) return error.statusCode;
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return undefined;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
