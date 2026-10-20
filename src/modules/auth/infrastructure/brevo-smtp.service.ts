import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Environment } from '../../../config/environment.js';

@Injectable()
export class BrevoSmtpService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const username = this.config.get('BREVO_SMTP_USER');
    const password = this.config.get('BREVO_SMTP_KEY');
    const senderEmail = this.config.get('BREVO_SENDER_EMAIL');
    if (!username || !password || !senderEmail) {
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: 'Email verification is not configured on this server.',
      });
    }

    const transport = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: { user: username, pass: password },
    });
    await transport.sendMail({
      from: {
        name: this.config.get('BREVO_SENDER_NAME') ?? 'Hello World',
        address: senderEmail,
      },
      to: email,
      subject: 'Confirmez votre adresse e-mail',
      text: `Votre code de vérification Hello World est ${code}. Il expire dans 10 minutes.`,
      html: `<p>Votre code de vérification Hello World est <strong>${code}</strong>.</p><p>Il expire dans 10 minutes.</p>`,
    });
  }
}
