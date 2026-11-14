import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Environment } from '../../../config/environment.js';
import type { EmailVerificationPurpose } from './email-verification.entity.js';

const PUBLIC_EMAIL_ERROR =
  "Impossible d'envoyer l'e-mail pour le moment. Réessaie plus tard.";

// Brevo transactional email relay (SMTP submission on port 587).
@Injectable()
export class SmtpEmailService {
  private readonly logger = new Logger(SmtpEmailService.name);

  constructor(private readonly config: ConfigService<Environment, true>) {}

  async sendVerificationCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose = 'registration',
  ): Promise<void> {
    const user = this.config.get('BREVO_SMTP_LOGIN');
    const key = this.config.get('BREVO_SMTP_KEY');
    const fromEmail = this.config.get('BREVO_FROM_EMAIL');
    if (!user || !key || !fromEmail) {
      this.logger.error('Brevo SMTP is not configured.');
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: PUBLIC_EMAIL_ERROR,
      });
    }
    const transport = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: { user, pass: key },
    });
    const purposeLabel =
      purpose === 'login'
        ? 'connexion à votre compte'
        : purpose === 'password-reset'
          ? 'réinitialisation de votre mot de passe'
          : 'confirmation de votre inscription';
    const subject =
      purpose === 'login'
        ? 'Votre code de connexion Hello World'
        : purpose === 'password-reset'
          ? 'Votre code de réinitialisation Hello World'
          : 'Confirmez votre adresse e-mail';
    const title =
      purpose === 'login'
        ? 'Votre code de connexion'
        : purpose === 'password-reset'
          ? 'Réinitialisez votre mot de passe'
          : 'Votre code de vérification';
    const expiryMinutes = purpose === 'password-reset' ? 2 : 4;
    try {
      await transport.sendMail({
        from: {
          name: this.config.get('BREVO_FROM_NAME') ?? 'Hello World',
          address: fromEmail,
        },
        to: email,
        subject,
        text: `Votre code pour ${purposeLabel} Hello World : ${code}. Il expire dans ${expiryMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:32px 16px;background-color:#141414;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;border-collapse:separate;border-spacing:0;background-color:#202020;border:1px solid #373737;border-radius:14px;">
      <tr>
        <td style="padding:32px 28px;text-align:center;">
          <p style="margin:0 0 24px;color:#f5f5f5;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Hello World</p>
          <h1 style="margin:0 0 12px;color:#ffffff;font-size:22px;line-height:1.3;font-weight:700;">${title}</h1>
          <p style="margin:0 0 24px;color:#c7c7c7;font-size:15px;line-height:1.6;">Utilisez le code ci-dessous pour ${purposeLabel}.</p>
          <div style="margin:0 auto 24px;padding:20px 12px;background-color:#111111;border:1px solid #4a4a4a;border-radius:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:12px;line-height:1.2;text-align:center;">${code}</div>
          <p style="margin:0;color:#b0b0b3;font-size:14px;line-height:1.6;">Ce code expire dans <strong style="color:#ffffff;">${expiryMinutes} minutes</strong>.</p>
          <p style="margin:20px 0 0;color:#8b8b8c;font-size:12px;line-height:1.6;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      });
    } catch (error) {
      this.logger.error(
        `SMTP delivery failed for ${purpose} (${error instanceof Error ? error.message : 'unknown error'}).`,
      );
      const responseCode =
        typeof error === 'object' && error !== null && 'responseCode' in error
          ? Number(error.responseCode)
          : undefined;
      if (responseCode === 535) {
        throw new ServiceUnavailableException({
          code: 'EMAIL_PROVIDER_AUTH_FAILED',
          message: PUBLIC_EMAIL_ERROR,
        });
      }
      throw new ServiceUnavailableException(
        {
          code: 'EMAIL_PROVIDER_UNAVAILABLE',
          message: PUBLIC_EMAIL_ERROR,
        },
        { cause: error },
      );
    }
  }
}
