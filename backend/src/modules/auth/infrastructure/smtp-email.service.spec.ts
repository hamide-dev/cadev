import * as nodemailer from 'nodemailer';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import { SmtpEmailService } from './smtp-email.service.js';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

describe('SmtpEmailService using Brevo', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    vi.mocked(nodemailer.createTransport).mockClear();
  });

  it('sends the OTP through Brevo SMTP', async () => {
    const service = createService();

    await service.sendVerificationCode('user@example.test', '1234');

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: 'smtp-login@example.test', pass: 'smtp-key' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: 'Test sender', address: 'sender@example.test' },
        to: 'user@example.test',
        text: expect.stringContaining('1234'),
      }),
    );
  });

  it('sends a password-reset email with the matching subject and purpose', async () => {
    const service = createService();

    await service.sendVerificationCode(
      'user@example.test',
      '0042',
      'password-reset',
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.test',
        subject: 'Votre code de réinitialisation Hello World',
        text: expect.stringMatching(
          /réinitialisation de votre mot de passe.*expire dans 2 minutes/,
        ),
        html: expect.stringContaining('Réinitialisez votre mot de passe'),
        html: expect.stringContaining(
          'expire dans <strong style="color:#ffffff;">2 minutes</strong>',
        ),
      }),
    );
  });

  it('fails clearly when Brevo is not configured', async () => {
    const service = createService({ BREVO_SMTP_LOGIN: undefined });

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: { code: 'EMAIL_PROVIDER_NOT_CONFIGURED' },
    });
  });

  it('maps SMTP connection failures without exposing provider details', async () => {
    sendMail.mockRejectedValue(new Error('offline'));
    const service = createService();

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: { code: 'EMAIL_PROVIDER_UNAVAILABLE' },
    });
    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function createService(overrides: Partial<Record<string, unknown>> = {}) {
  const values: Record<string, unknown> = {
    BREVO_SMTP_LOGIN: 'smtp-login@example.test',
    BREVO_SMTP_KEY: 'smtp-key',
    BREVO_FROM_EMAIL: 'sender@example.test',
    BREVO_FROM_NAME: 'Test sender',
    NODE_ENV: 'test',
    ...overrides,
  };
  const config = {
    get: vi.fn((key: string) => values[key]),
  };
  return new SmtpEmailService(
    config as ConfigService<Environment, true>,
  );
}
