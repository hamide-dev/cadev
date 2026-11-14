import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MediaService } from '../../media/application/media.service.js';
import { MediaAssetEntity } from '../../media/infrastructure/media-asset.entity.js';
import { MessagingService } from './messaging.service.js';
import {
  ConversationEntity,
  ConversationMemberEntity,
} from '../infrastructure/conversation.entity.js';
import { MessageEntity } from '../infrastructure/message.entity.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';

describe('MessagingService', () => {
  it('returns unread message counts for each conversation', async () => {
    const userId = '9dd1e06a-983c-4d68-b507-c611ca65e567';
    const conversationId = '292bbd98-e066-4550-9dbc-bb2debc54468';
    const conversationsQuery = {
      innerJoin: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: conversationId,
          type: 'DIRECT',
          name: null,
          members: [
            {
              user: { id: userId, username: 'me', displayName: 'Me' },
            },
          ],
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    };
    const unreadQuery = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      getRawMany: vi
        .fn()
        .mockResolvedValue([{ conversationId, unreadCount: '3' }]),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(ConversationEntity),
          useValue: {
            createQueryBuilder: vi.fn().mockReturnValue(conversationsQuery),
          },
        },
        {
          provide: getRepositoryToken(ConversationMemberEntity),
          useValue: {
            createQueryBuilder: vi.fn().mockReturnValue(unreadQuery),
          },
        },
        { provide: getRepositoryToken(MessageEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(MediaAssetEntity),
          useValue: {},
        },
        { provide: MediaService, useValue: {} },
      ],
    }).compile();

    await expect(
      testingModule.get(MessagingService).listConversations(userId),
    ).resolves.toMatchObject([
      { id: conversationId, unreadCount: 3 },
    ]);
    expect(unreadQuery.leftJoin).toHaveBeenCalledWith(
      MessageEntity,
      'message',
      expect.stringContaining('membership.lastReadAt'),
      { userId },
    );
  });

  it('rejects sending to a conversation the user does not belong to', async () => {
    const membersRepository = {
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(ConversationEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ConversationMemberEntity),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {},
        },
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(MediaAssetEntity),
          useValue: {},
        },
        {
          provide: MediaService,
          useValue: {},
        },
      ],
    }).compile();

    await expect(
      testingModule
        .get(MessagingService)
        .send('9dd1e06a-983c-4d68-b507-c611ca65e567', {
          conversationId: '292bbd98-e066-4550-9dbc-bb2debc54468',
          type: 'TEXT',
          content: 'Not allowed',
        }),
    ).rejects.toMatchObject({
      response: {
        code: 'CONVERSATION_ACCESS_DENIED',
      },
    });
    expect(membersRepository.findOneBy).toHaveBeenCalledWith({
      conversationId: '292bbd98-e066-4550-9dbc-bb2debc54468',
      userId: '9dd1e06a-983c-4d68-b507-c611ca65e567',
    });
  });
});
