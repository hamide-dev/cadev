import { BrevoClient } from '@getbrevo/brevo';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import { BrevoEmailService } from './brevo-email.service.js';

const { sendTransacEmail } = vi.hoisted(() => ({
  sendTransacEmail: vi.fn(),
}));

vi.mock('@getbrevo/brevo', () => ({
  BrevoClient: vi.fn(
    class {
      transactionalEmails = { sendTransacEmail };
    },
  ),
  BrevoError: class BrevoError extends Error {
    statusCode?: number;
  },
}));

describe('BrevoEmailService', () => {
  beforeEach(() => {
    sendTransacEmail.mockReset().mockResolvedValue({});
    vi.mocked(BrevoClient).mockClear();
  });

  it('sends the OTP through the official Brevo transactional email SDK', async () => {
    const service = createService();

    await service.sendVerificationCode('user@example.test', '1234');

    expect(BrevoClient).toHaveBeenCalledWith({ apiKey: 'api-key' });
    expect(sendTransacEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: { name: 'Test sender', email: 'sender@example.test' },
        to: [{ email: 'user@example.test' }],
        textContent: expect.stringContaining('1234'),
      }),
    );
  });

  it('returns an actionable error when the API key is rejected', async () => {
    sendTransacEmail.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
    );
    const service = createService();

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: {
        code: 'EMAIL_PROVIDER_AUTH_FAILED',
        message: expect.stringContaining('BREVO_API_KEY'),
      },
    });
  });

  it('identifies Brevo IP authorization failures separately from invalid keys', async () => {
    sendTransacEmail.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );
    const service = createService();

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: {
        code: 'EMAIL_PROVIDER_IP_NOT_AUTHORIZED',
        message: expect.stringContaining('public outbound IP'),
      },
    });
  });

  it('identifies a rejected sender configuration', async () => {
    sendTransacEmail.mockRejectedValue(
      Object.assign(new Error('Bad request'), { statusCode: 400 }),
    );
    const service = createService();

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: { code: 'EMAIL_PROVIDER_SENDER_INVALID' },
    });
  });

  it('fails clearly when the SDK cannot reach Brevo', async () => {
    sendTransacEmail.mockRejectedValue(new Error('offline'));
    const service = createService();

    let caught: unknown;
    try {
      await service.sendVerificationCode('user@example.test', '1234');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    expect(caught).toMatchObject({
      response: { code: 'EMAIL_PROVIDER_UNAVAILABLE' },
    });
  });
});

function createService(): BrevoEmailService {
  const config = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        BREVO_API_KEY: 'api-key',
        BREVO_SENDER_EMAIL: 'sender@example.test',
        BREVO_SENDER_NAME: 'Test sender',
        NODE_ENV: 'test',
      };
      return values[key];
    }),
  };
  return new BrevoEmailService(config as ConfigService<Environment, true>);
}
