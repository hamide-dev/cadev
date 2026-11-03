import * as nodemailer from 'nodemailer';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import { SmtpEmailService } from './smtp-email.service.js';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

describe('SmtpEmailService', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    vi.mocked(nodemailer.createTransport).mockClear();
  });

  it('sends the OTP through the configured SMTP server', async () => {
    const service = createService();

    await service.sendVerificationCode('user@example.test', '1234');

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
      host: '127.0.0.1',
      port: 25,
      secure: false,
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

  it('fails clearly when SMTP is not configured', async () => {
    const service = createService({ SMTP_HOST: undefined });

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
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: 25,
    SMTP_SECURE: false,
    SMTP_FROM_EMAIL: 'sender@example.test',
    SMTP_FROM_NAME: 'Test sender',
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
