import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationEntity } from './infrastructure/notification.entity.js';
import { PushSubscriptionEntity } from './infrastructure/push-subscription.entity.js';
import { PushNotificationsService } from './application/push-notifications.service.js';
import { NotificationsController } from './presentation/notifications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, PushSubscriptionEntity]),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationsService],
  exports: [NotificationsService, PushNotificationsService],
})
export class NotificationsModule {}
