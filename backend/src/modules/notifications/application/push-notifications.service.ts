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
import { sendNotification, setVapidDetails } from 'web-push';
import { PushSubscriptionEntity } from '../infrastructure/push-subscription.entity.js';
import type { PushSubscriptionDto } from '../presentation/dto/push-subscription.dto.js';

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  /** Photo de la personne à l'origine de la notification (affichée à gauche). */
  icon?: string | null;
  /** Même tag = la nouvelle notification remplace l'ancienne (une par conversation ou publication). */
  tag?: string;
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
      setVapidDetails(subject, this.publicKey, privateKey);
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
    this.assertKnownPushEndpoint(input.endpoint);
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
    this.assertKnownPushEndpoint(endpoint);
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
          await sendNotification(
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

  // Seuls les services push officiels des navigateurs sont acceptés (le serveur n'envoie jamais
  // de requête vers une adresse choisie librement) : Chrome / Android, Safari / iPhone, Firefox, Edge.
  private assertKnownPushEndpoint(endpoint: string): void {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw this.invalidEndpoint();
    }
    const host = url.hostname;
    const known =
      host === 'fcm.googleapis.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.push.apple.com') ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.notify.windows.com');
    if (url.protocol !== 'https:' || !known || url.port || url.username || url.password) {
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
