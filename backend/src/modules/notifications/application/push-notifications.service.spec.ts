import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { sendNotification } from 'web-push';
import type { Environment } from '../../../config/environment.js';
import { PushSubscriptionEntity } from '../infrastructure/push-subscription.entity.js';
import { PushNotificationsService } from './push-notifications.service.js';

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

describe('PushNotificationsService', () => {
  const endpoint = 'https://fcm.googleapis.com/fcm/send/device-token';
  const subscriptions = {
    delete: vi.fn(),
    findBy: vi.fn(),
    upsert: vi.fn(),
  };
  const configValues: Partial<Environment> = {
    WEB_PUSH_PUBLIC_KEY: 'public-key',
    WEB_PUSH_PRIVATE_KEY: 'private-key',
    WEB_PUSH_SUBJECT: 'mailto:notifications@example.test',
  };
  let service: PushNotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const configGet = vi.fn((key: string) => configValues[key as keyof Environment]);
    const testingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        {
          provide: getRepositoryToken(PushSubscriptionEntity),
          useValue: subscriptions,
        },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    service = testingModule.get(PushNotificationsService);
  });

  it('stores a valid Chrome push subscription', async () => {
    await expect(
      service.saveSubscription('user-id', {
        endpoint,
        keys: { p256dh: 'public-key', auth: 'auth-key' },
      }),
    ).resolves.toEqual({ subscribed: true });

    expect(subscriptions.upsert).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        endpoint,
        p256dh: 'public-key',
        auth: 'auth-key',
      },
      ['endpoint'],
    );
  });

  it('rejects non-Google push endpoints to prevent server-side requests to arbitrary hosts', async () => {
    await expect(
      service.saveSubscription('user-id', {
        endpoint: 'https://127.0.0.1/internal',
        keys: { p256dh: 'public-key', auth: 'auth-key' },
      }),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_PUSH_ENDPOINT' },
    });

    expect(subscriptions.upsert).not.toHaveBeenCalled();
  });

  it('removes expired subscriptions after the push provider rejects them', async () => {
    subscriptions.findBy.mockResolvedValue([
      { endpoint, p256dh: 'public-key', auth: 'auth-key' },
    ]);
    vi.mocked(sendNotification).mockRejectedValue(
      Object.assign(new Error('expired'), { statusCode: 410 }),
    );

    await service.sendToUser('user-id', {
      title: 'Hello World',
      body: 'Nouvelle notification.',
      url: '/notifications',
    });

    expect(subscriptions.delete).toHaveBeenCalledWith({ endpoint });
  });
});
