import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { MediaModule } from '../media/media.module.js';
import { UserEntity } from '../users/infrastructure/user.entity.js';
import { MessagingService } from './application/messaging.service.js';
import {
  ConversationEntity,
  ConversationMemberEntity,
} from './infrastructure/conversation.entity.js';
import { MessageEntity } from './infrastructure/message.entity.js';
import { MessagingGateway } from './presentation/messaging.gateway.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConversationMemberEntity,
      MessageEntity,
      UserEntity,
    ]),
    SecurityModule,
    MediaModule,
  ],
  providers: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
