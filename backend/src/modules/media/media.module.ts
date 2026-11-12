import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { UsersModule } from '../users/users.module.js';
import { ConversationMemberEntity } from '../messaging/infrastructure/conversation.entity.js';
import { ConversationEntity } from '../messaging/infrastructure/conversation.entity.js';
import { MessageEntity } from '../messaging/infrastructure/message.entity.js';
import { CloudinaryAdapter } from './infrastructure/cloudinary.adapter.js';
import { MediaAssetEntity } from './infrastructure/media-asset.entity.js';
import { MediaService } from './application/media.service.js';
import { MediaController } from './presentation/media.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MediaAssetEntity,
      ConversationMemberEntity,
      ConversationEntity,
      MessageEntity,
    ]),
    UsersModule,
    SecurityModule,
  ],
  controllers: [MediaController],
  providers: [CloudinaryAdapter, MediaService],
  exports: [MediaService, TypeOrmModule],
})
export class MediaModule {}
