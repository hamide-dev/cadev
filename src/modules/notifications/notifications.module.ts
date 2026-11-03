import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationEntity } from './infrastructure/notification.entity.js';
import { NotificationsController } from './presentation/notifications.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
