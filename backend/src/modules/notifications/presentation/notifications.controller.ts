import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import { NotificationsService } from '../application/notifications.service.js';
import { PushNotificationsService } from '../application/push-notifications.service.js';
import {
  PushSubscriptionDto,
  RemovePushSubscriptionDto,
} from './dto/push-subscription.dto.js';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly pushNotifications: PushNotificationsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listForUser(user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Get('push/config')
  pushConfiguration() {
    return this.pushNotifications.getConfiguration();
  }

  @Post('push-subscription')
  savePushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() input: PushSubscriptionDto,
  ) {
    return this.pushNotifications.saveSubscription(user.id, input);
  }

  @Delete('push-subscription')
  removePushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() input: RemovePushSubscriptionDto,
  ) {
    return this.pushNotifications.removeSubscription(user.id, input.endpoint);
  }
}
