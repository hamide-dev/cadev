import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import type { Repository } from 'typeorm';
import webPush from 'web-push';
import { PushSubscriptionEntity } from '../infrastructure/push-subscription.entity.js';
import type { PushSubscriptionDto } from '../presentation/dto/push-subscription.dto.js';

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly publicKey: string | undefined;
  private readonly isConfigured: boolean;

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptions: Repository<PushSubscriptionEntity>,
    config: ConfigService<Environment, true>,
  ) {
    this.publicKey = config.get('WEB_PUSH_PUBLIC_KEY', { infer: true });
    const privateKey = config.get('WEB_PUSH_PRIVATE_KEY', { infer: true });
    const subject = config.get('WEB_PUSH_SUBJECT', { infer: true });
    this.isConfigured = Boolean(this.publicKey && privateKey && subject);
    if (this.publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, this.publicKey, privateKey);
    }
  }

  getConfiguration(): { configured: boolean; publicKey: string | null } {
    return {
      configured: this.isConfigured,
      publicKey: this.isConfigured ? (this.publicKey ?? null) : null,
    };
  }

  async saveSubscription(
    userId: string,
    input: PushSubscriptionDto,
  ): Promise<{ subscribed: true }> {
    this.assertConfigured();
    this.assertChromePushEndpoint(input.endpoint);
    await this.subscriptions.upsert(
      {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
      ['endpoint'],
    );
    return { subscribed: true };
  }

  async removeSubscription(
    userId: string,
    endpoint: string,
  ): Promise<{ unsubscribed: true }> {
    this.assertChromePushEndpoint(endpoint);
    await this.subscriptions.delete({ userId, endpoint });
    return { unsubscribed: true };
  }

  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    if (!this.isConfigured) return;
    let subscriptions: PushSubscriptionEntity[];
    try {
      subscriptions = await this.subscriptions.findBy({ userId });
    } catch (error) {
      this.logger.error(
        `Could not load Web Push subscriptions: ${getErrorName(error)}.`,
      );
      return;
    }
    const expired: string[] = [];
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            toWebPushSubscription(subscription),
            JSON.stringify(message),
          );
        } catch (error) {
          const statusCode = getStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            expired.push(subscription.endpoint);
            return;
          }
          this.logger.warn(
            `Web Push delivery failed for a user subscription (HTTP ${statusCode ?? 'unknown'}).`,
          );
        }
      }),
    );
    for (const endpoint of expired) {
      try {
        await this.subscriptions.delete({ endpoint });
      } catch (error) {
        this.logger.error(
          `Could not remove an expired Web Push subscription: ${getErrorName(error)}.`,
        );
      }
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException({
        code: 'PUSH_NOT_CONFIGURED',
        message: 'Browser notifications are not configured on this server.',
      });
    }
  }

  private assertChromePushEndpoint(endpoint: string): void {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw this.invalidEndpoint();
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'fcm.googleapis.com' ||
      url.port ||
      url.username ||
      url.password
    ) {
      throw this.invalidEndpoint();
    }
  }

  private invalidEndpoint(): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_PUSH_ENDPOINT',
      message: 'The browser push endpoint is invalid.',
    });
  }
}

function toWebPushSubscription(subscription: PushSubscriptionEntity) {
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
}

function getStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return undefined;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown error';
}
