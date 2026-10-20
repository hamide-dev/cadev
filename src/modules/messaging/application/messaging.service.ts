import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { isUniqueViolation } from '../../../database/is-unique-violation.js';
import { MediaService } from '../../media/application/media.service.js';
import { MediaAssetEntity } from '../../media/infrastructure/media-asset.entity.js';
import { MediaPurpose } from '../../media/domain/media.types.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import {
  ConversationType,
  type PublicConversation,
  type PublicMessage,
} from '../domain/messaging.types.js';
import {
  ConversationEntity,
  ConversationMemberEntity,
} from '../infrastructure/conversation.entity.js';
import { MessageEntity } from '../infrastructure/message.entity.js';
import type { CreateConversationDto } from '../presentation/dto/create-conversation.dto.js';
import type { MessageHistoryDto } from '../presentation/dto/message-history.dto.js';
import type { SendMessageDto } from '../presentation/dto/send-message.dto.js';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: Repository<ConversationEntity>,
    @InjectRepository(ConversationMemberEntity)
    private readonly members: Repository<ConversationMemberEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
  ) {}

  async createConversation(
    creatorId: string,
    input: CreateConversationDto,
  ): Promise<PublicConversation> {
    const memberIds = [...new Set([creatorId, ...input.memberIds])];
    if (input.type === ConversationType.DIRECT && memberIds.length !== 2) {
      throw new ForbiddenException({
        code: 'INVALID_DIRECT_CONVERSATION',
        message: 'A direct conversation requires exactly two members.',
      });
    }
    if (input.type === ConversationType.GROUP && memberIds.length < 2) {
      throw new ForbiddenException({
        code: 'INVALID_GROUP',
        message: 'A group conversation requires at least two members.',
      });
    }
    const existingUsers = await this.users.find({
      where: { id: In(memberIds) },
      select: { id: true, username: true },
    });
    if (existingUsers.length !== memberIds.length) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'One or more conversation members do not exist.',
      });
    }
    const directKey =
      input.type === ConversationType.DIRECT
        ? [...memberIds].sort().join(':')
        : null;

    try {
      const conversationId = await this.dataSource.transaction(
        async (manager) => {
          const conversationRepository =
            manager.getRepository(ConversationEntity);
          const memberRepository = manager.getRepository(
            ConversationMemberEntity,
          );
          const conversation = await conversationRepository.save(
            conversationRepository.create({
              type: input.type,
              name:
                input.type === ConversationType.GROUP
                  ? (input.name?.trim() ?? null)
                  : null,
              directKey,
              createdById: creatorId,
            }),
          );
          await memberRepository.save(
            memberIds.map((userId) =>
              memberRepository.create({
                conversationId: conversation.id,
                userId,
                isAdmin: userId === creatorId,
              }),
            ),
          );
          return conversation.id;
        },
      );
      return this.getConversation(conversationId);
    } catch (error) {
      if (directKey && isUniqueViolation(error)) {
        const existing = await this.conversations.findOneBy({ directKey });
        if (existing) return this.getConversation(existing.id);
      }
      throw error;
    }
  }

  async listConversations(userId: string): Promise<PublicConversation[]> {
    const conversations = await this.conversations
      .createQueryBuilder('conversation')
      .innerJoin(
        'conversation.members',
        'requesterMembership',
        'requesterMembership.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('conversation.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .orderBy('conversation.createdAt', 'DESC')
      .take(100)
      .getMany();
    return conversations.map(mapConversation);
  }

  async getConversation(
    conversationId: string,
    requesterId?: string,
  ): Promise<PublicConversation> {
    if (requesterId) await this.assertMember(conversationId, requesterId);
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
      relations: { members: { user: true } },
    });
    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.',
      });
    }
    return mapConversation(conversation);
  }

  async assertMember(conversationId: string, userId: string): Promise<void> {
    const membership = await this.members.findOneBy({ conversationId, userId });
    if (!membership) {
      throw new ForbiddenException({
        code: 'CONVERSATION_ACCESS_DENIED',
        message: 'You are not a member of this conversation.',
      });
    }
  }

  async history(
    userId: string,
    input: MessageHistoryDto,
  ): Promise<PublicMessage[]> {
    await this.assertMember(input.conversationId, userId);
    const query = this.messages
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', {
        conversationId: input.conversationId,
      })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(input.limit ?? 50);
    if (input.before) {
      query.andWhere('message.createdAt < :before', {
        before: input.before,
      });
    }
    const messages = (await query.getMany()).reverse();
    const attachments = await this.mediaService.getPublicAttachments(
      messages.map((message) => message.id),
    );
    return messages.map((message) =>
      mapMessage(message, attachments.get(message.id) ?? []),
    );
  }

  async send(senderId: string, input: SendMessageDto): Promise<PublicMessage> {
    await this.assertMember(input.conversationId, senderId);
    const attachmentIds = input.attachmentIds ?? [];
    const content = input.content?.trim() ?? '';
    if (
      (input.type === 'MEDIA' && attachmentIds.length === 0) ||
      (input.type !== 'MEDIA' && (attachmentIds.length > 0 || !content))
    ) {
      throw new BadRequestException({
        code: 'INVALID_MESSAGE_CONTENT',
        message:
          'Media messages require an attachment; text, code, and link messages require content and cannot contain attachments.',
      });
    }
    if (attachmentIds.length > 0) {
      await this.mediaService.getAttachableChatAssets(
        senderId,
        input.conversationId,
        attachmentIds,
      );
    }
    if (input.parentMessageId) {
      const parent = await this.messages.findOneBy({
        id: input.parentMessageId,
        conversationId: input.conversationId,
      });
      if (!parent) {
        throw new NotFoundException({
          code: 'PARENT_MESSAGE_NOT_FOUND',
          message: 'The parent message must belong to this conversation.',
        });
      }
    }
    const messageId = await this.dataSource.transaction(async (manager) => {
      const messageRepository = manager.getRepository(MessageEntity);
      const mediaRepository = manager.getRepository(MediaAssetEntity);
      const message = await messageRepository.save(
        messageRepository.create({
          conversationId: input.conversationId,
          senderId,
          type: input.type,
          content,
          parentMessageId: input.parentMessageId ?? null,
        }),
      );
      if (attachmentIds.length > 0) {
        const attachableAssets = await mediaRepository.find({
          where: {
            id: In(attachmentIds),
            ownerId: senderId,
            conversationId: input.conversationId,
            purpose: MediaPurpose.CHAT,
            messageId: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (attachableAssets.length !== attachmentIds.length) {
          throw new ConflictException({
            code: 'MEDIA_ASSET_NOT_ATTACHABLE',
            message: 'One or more media assets have already been attached.',
          });
        }
        await mediaRepository.update(
          { id: In(attachmentIds) },
          { messageId: message.id },
        );
      }
      return message.id;
    });
    const persisted = await this.messages.findOne({
      where: { id: messageId },
      relations: { sender: true },
    });
    if (!persisted) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'The saved message could not be loaded.',
      });
    }
    const attachments = await this.mediaService.getPublicAttachments([
      messageId,
    ]);
    return mapMessage(persisted, attachments.get(messageId) ?? []);
  }
}

function mapMessage(
  message: MessageEntity,
  attachments: PublicMessage['attachments'] = [],
): PublicMessage {
  if (!message.sender) {
    throw new Error('Message sender must be loaded to map a public message');
  }
  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: {
      id: message.sender.id,
      username: message.sender.username,
      displayName: message.sender.displayName,
      avatarUrl: message.sender.avatarUrl,
    },
    type: message.type,
    content: message.content,
    parentMessageId: message.parentMessageId,
    attachments,
    createdAt: message.createdAt.toISOString(),
  };
}

function mapConversation(conversation: ConversationEntity): PublicConversation {
  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    members: conversation.members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      displayName: member.user.displayName,
    })),
    createdAt: conversation.createdAt.toISOString(),
  };
}
