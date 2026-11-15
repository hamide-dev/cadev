import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../../users/application/users.service.js';
import {
  NotificationEntity,
  NotificationType,
} from '../infrastructure/notification.entity.js';
import { PushNotificationsService } from './push-notifications.service.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService push delivery', () => {
  const notifications = {
    create: vi.fn((input: unknown) => input),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const pushNotifications = { sendToUser: vi.fn().mockResolvedValue(undefined) };
  let service: NotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const testingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(NotificationEntity), useValue: notifications },
        {
          provide: UsersService,
          useValue: { findById: vi.fn().mockResolvedValue({ displayName: 'Awa Diop', username: 'awacodes', avatarUrl: 'https://img.test/awa.jpg' }) },
        },
        { provide: PushNotificationsService, useValue: pushNotifications },
      ],
    }).compile();
    service = testingModule.get(NotificationsService);
  });

  it.each([
    [NotificationType.LIKE, 'a aimé ta publication ❤️', 'post-post-id-like'],
    [NotificationType.COMMENT, 'a commenté ta publication 💬', 'post-post-id-comment'],
    [NotificationType.REPLY, 'a répondu à ton commentaire 💬', 'post-post-id-reply'],
    [NotificationType.MENTION, 't’a mentionné @', 'post-post-id-mention'],
  ])('pushes %s notifications with the actor name and photo', async (type, body, tag) => {
    await service.notifyUser('actor-id', 'recipient-id', type, 'post-id', 'comment-id');

    expect(pushNotifications.sendToUser).toHaveBeenCalledWith('recipient-id', {
      title: 'Awa Diop',
      body,
      url: '/post/post-id',
      icon: 'https://img.test/awa.jpg',
      tag,
    });
  });

  it('pushes FOLLOW notifications that open the follower profile', async () => {
    await service.notifyUser('actor-id', 'recipient-id', NotificationType.FOLLOW, null, null);

    expect(pushNotifications.sendToUser).toHaveBeenCalledWith('recipient-id', {
      title: 'Awa Diop',
      body: 's’est abonné à toi',
      url: '/u/awacodes',
      icon: 'https://img.test/awa.jpg',
      tag: 'follow-actor-id',
    });
  });

  it('does not send a push notification for a self-action', async () => {
    await service.notifyUser(
      'same-user',
      'same-user',
      NotificationType.LIKE,
      'post-id',
      null,
    );

    expect(notifications.save).not.toHaveBeenCalled();
    expect(pushNotifications.sendToUser).not.toHaveBeenCalled();
  });
});
