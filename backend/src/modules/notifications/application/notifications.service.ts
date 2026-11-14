import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PublicUser } from '../../users/domain/user.types.js';
import { UsersService } from '../../users/application/users.service.js';
import { NotificationEntity, NotificationType } from '../infrastructure/notification.entity.js';
import { PushNotificationsService } from './push-notifications.service.js';

export interface PublicNotification {
  id: string;
  type: NotificationType;
  actor: PublicUser;
  message: string;
  postId: string | null;
  commentId: string | null;
  readAt: string | null;
  createdAt: string;
}

function getNotificationMessage(
  type: NotificationType,
  actorUsername: string,
): string {
  const actor = `@${actorUsername}`;
  switch (type) {
    case NotificationType.LIKE:
      return `${actor} a aimé votre publication`;
    case NotificationType.COMMENT:
      return `${actor} a commenté votre publication`;
    case NotificationType.REPLY:
      return `${actor} a répondu à votre commentaire`;
    case NotificationType.MENTION:
      return `${actor} vous a mentionné`;
    default:
      throw new Error(`Unsupported notification type: ${String(type)}`);
  }
}

function getPushMessage(type: NotificationType): string {
  switch (type) {
    case NotificationType.LIKE:
      return 'Quelqu’un a aimé votre publication.';
    case NotificationType.COMMENT:
      return 'Nouveau commentaire sur votre publication.';
    case NotificationType.REPLY:
      return 'Nouvelle réponse à votre commentaire.';
    case NotificationType.MENTION:
      return 'Vous avez été mentionné.';
    default:
      throw new Error(`Unsupported notification type: ${String(type)}`);
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    private readonly users: UsersService,
    private readonly pushNotifications: PushNotificationsService,
  ) {}

  async notifyMentions(
    actorId: string,
    userIds: string[],
    postId: string | null,
    commentId: string | null,
  ): Promise<void> {
    const recipients = userIds.filter((id) => id !== actorId);
    if (recipients.length === 0) return;
    await this.notifications.save(
      recipients.map((recipientId) =>
        this.notifications.create({
          recipientId,
          actorId,
          type: NotificationType.MENTION,
          postId,
          commentId,
          readAt: null,
        }),
      ),
    );
    await Promise.all(
      recipients.map((recipientId) =>
        this.pushNotifications.sendToUser(recipientId, {
          title: 'Hello World',
          body: getPushMessage(NotificationType.MENTION),
          url: postId ? `/post/${postId}` : '/notifications',
        }),
      ),
    );
  }

  async notifyUser(
    actorId: string,
    recipientId: string,
    type: NotificationType,
    postId: string | null,
    commentId: string | null,
  ): Promise<void> {
    if (actorId === recipientId) return;
    await this.notifications.save(
      this.notifications.create({
        recipientId,
        actorId,
        type,
        postId,
        commentId,
        readAt: null,
      }),
    );
    await this.pushNotifications.sendToUser(recipientId, {
      title: 'Hello World',
      body: getPushMessage(type),
      url: postId ? `/post/${postId}` : '/notifications',
    });
  }

  async listForUser(userId: string): Promise<PublicNotification[]> {
    const notifications = await this.notifications.find({
      where: { recipientId: userId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      actor: this.users.toPublic(notification.actor),
      message: getNotificationMessage(
        notification.type,
        notification.actor.username,
      ),
      postId: notification.postId,
      commentId: notification.commentId,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }));
  }
}
