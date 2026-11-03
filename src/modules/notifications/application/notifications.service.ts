import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PublicUser } from '../../users/domain/user.types.js';
import { UsersService } from '../../users/application/users.service.js';
import { NotificationEntity, NotificationType } from '../infrastructure/notification.entity.js';

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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    private readonly users: UsersService,
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
      message: `@${notification.actor.username} t’a mentionné`,
      postId: notification.postId,
      commentId: notification.commentId,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }));
  }
}
