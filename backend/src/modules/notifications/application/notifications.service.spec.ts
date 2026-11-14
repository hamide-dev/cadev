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
        { provide: UsersService, useValue: {} },
        { provide: PushNotificationsService, useValue: pushNotifications },
      ],
    }).compile();
    service = testingModule.get(NotificationsService);
  });

  it.each([
    [NotificationType.LIKE, 'Quelqu’un a aimé votre publication.'],
    [NotificationType.COMMENT, 'Nouveau commentaire sur votre publication.'],
    [NotificationType.REPLY, 'Nouvelle réponse à votre commentaire.'],
    [NotificationType.MENTION, 'Vous avez été mentionné.'],
  ])('pushes %s notifications to the recipient', async (type, body) => {
    await service.notifyUser(
      'actor-id',
      'recipient-id',
      type,
      'post-id',
      'comment-id',
    );

    expect(pushNotifications.sendToUser).toHaveBeenCalledWith(
      'recipient-id',
      {
        title: 'Hello World',
        body,
        url: '/post/post-id',
      },
    );
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
