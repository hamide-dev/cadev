import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
    case NotificationType.FOLLOW:
      return `${actor} s’est abonné à vous`;
    default:
      throw new Error(`Unsupported notification type: ${String(type)}`);
  }
}

// Texte affiché sous le nom de la personne, comme sur les réseaux sociaux.
function getPushMessage(type: NotificationType): string {
  switch (type) {
    case NotificationType.LIKE:
      return 'a aimé ta publication ❤️';
    case NotificationType.COMMENT:
      return 'a commenté ta publication 💬';
    case NotificationType.REPLY:
      return 'a répondu à ton commentaire 💬';
    case NotificationType.MENTION:
      return 't’a mentionné @';
    case NotificationType.FOLLOW:
      return 's’est abonné à toi';
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
    const actor = await this.actorForPush(actorId);
    await Promise.all(
      recipients.map((recipientId) =>
        this.pushNotifications.sendToUser(recipientId, {
          title: actor.name,
          body: getPushMessage(NotificationType.MENTION),
          url: postId ? `/post/${postId}` : '/notifications',
          icon: actor.avatarUrl,
          tag: postId ? `post-${postId}` : 'mention',
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
    const actor = await this.actorForPush(actorId);
    await this.pushNotifications.sendToUser(recipientId, {
      title: actor.name,
      body: getPushMessage(type),
      url: type === NotificationType.FOLLOW ? `/u/${actor.username}` : postId ? `/post/${postId}` : '/notifications',
      icon: actor.avatarUrl,
      tag: type === NotificationType.FOLLOW ? `follow-${actorId}` : postId ? `post-${postId}-${type.toLowerCase()}` : type.toLowerCase(),
    });
  }

  // Nom et photo de la personne à l'origine de la notification ; repli neutre si elle est introuvable.
  private async actorForPush(actorId: string): Promise<{ name: string; username: string; avatarUrl: string | null }> {
    try {
      const actor = await this.users.findById(actorId);
      return { name: actor.displayName, username: actor.username, avatarUrl: actor.avatarUrl };
    } catch {
      return { name: 'Hello World', username: '', avatarUrl: null };
    }
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

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notifications.update(
      { recipientId: userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }
}
