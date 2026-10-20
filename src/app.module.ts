import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PostsModule } from './modules/posts/posts.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { GitHubPreviewModule } from './modules/github-preview/github-preview.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PostsModule,
    MessagingModule,
    MediaModule,
    GitHubPreviewModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
