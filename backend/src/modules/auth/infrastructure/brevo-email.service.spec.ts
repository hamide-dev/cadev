import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import { BrevoEmailService } from './brevo-email.service.js';

const fetchMock = vi.fn<typeof fetch>();

describe('BrevoEmailService', () => {
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(
      new Response(null, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends verification email through the Brevo HTTPS API', async () => {
    const service = createService();

    await service.sendVerificationCode('user@example.test', '1234');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': 'brevo-api-key',
          'content-type': 'application/json',
        },
      }),
    );
    expect(sentPayload()).toMatchObject({
      sender: { name: 'Test sender', email: 'sender@example.test' },
      to: [{ email: 'user@example.test' }],
      subject: 'Confirme ton adresse e-mail · Hello World',
      textContent: expect.stringContaining('1234'),
    });
  });

  it('uses the correct subject and expiry for password reset emails', async () => {
    const service = createService();

    await service.sendVerificationCode(
      'user@example.test',
      '0042',
      'password-reset',
    );

    expect(sentPayload()).toMatchObject({
      subject: 'Ton code de réinitialisation Hello World',
      textContent: expect.stringMatching(
        /réinitialisation de ton mot de passe.*expire dans 2 minutes/,
      ),
      htmlContent: expect.stringContaining(
        'expire dans <strong style="color:#ffffff;">2 minutes</strong>',
      ),
    });
  });

  it('fails with a generic client message when Brevo is not configured', async () => {
    const service = createService({ BREVO_API_KEY: undefined });

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: {
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: "Impossible d'envoyer l'e-mail pour le moment. Réessaie plus tard.",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hides Brevo API errors from clients while logging the HTTP status', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const service = createService();
    const error = await service
      .sendVerificationCode('user@example.test', '1234')
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error).toMatchObject({
      response: {
        code: 'EMAIL_PROVIDER_AUTH_FAILED',
        message:
          "Impossible d'envoyer l'e-mail pour le moment. Réessaie plus tard.",
      },
    });
  });

  it('maps network failures to a generic service error', async () => {
    fetchMock.mockRejectedValue(new Error('network timeout'));
    const service = createService();

    await expect(
      service.sendVerificationCode('user@example.test', '1234'),
    ).rejects.toMatchObject({
      response: {
        code: 'EMAIL_PROVIDER_UNAVAILABLE',
        message: "Impossible d'envoyer l'e-mail pour le moment. Réessaie plus tard.",
      },
    });
  });
});

function createService(overrides: Partial<Record<string, unknown>> = {}) {
  const values: Record<string, unknown> = {
    BREVO_API_KEY: 'brevo-api-key',
    BREVO_FROM_EMAIL: 'sender@example.test',
    BREVO_FROM_NAME: 'Test sender',
    ...overrides,
  };
  const config = {
    get: vi.fn((key: string) => values[key]),
  };
  return new BrevoEmailService(
    config as ConfigService<Environment, true>,
  );
}

function sentPayload(): unknown {
  const body = fetchMock.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') {
    throw new Error('Expected a JSON request body');
  }
  return JSON.parse(body);
}
