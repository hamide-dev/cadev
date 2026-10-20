import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommentsService } from './comments.service.js';
import { CommentEntity } from '../infrastructure/comment.entity.js';
import { PostEntity } from '../infrastructure/post.entity.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { CommentMentionEntity } from '../infrastructure/comment-mention.entity.js';
import { CommentVoteEntity } from '../infrastructure/comment-vote.entity.js';

describe('CommentsService', () => {
  it('rejects a reply whose parent comment belongs to another post', async () => {
    const commentsRepository = {
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    const postsRepository = {
      existsBy: vi.fn().mockResolvedValue(true),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(CommentEntity),
          useValue: commentsRepository,
        },
        {
          provide: getRepositoryToken(PostEntity),
          useValue: postsRepository,
        },
        {
          provide: getRepositoryToken(CommentVoteEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CommentMentionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {},
        },
      ],
    }).compile();

    await expect(
      testingModule.get(CommentsService).create(
        '292bbd98-e066-4550-9dbc-bb2debc54468',
        {
          id: '9dd1e06a-983c-4d68-b507-c611ca65e567',
          email: 'dev@example.test',
        },
        {
          content: 'A reply',
          parentCommentId: '1b635eab-83fc-42b9-86e8-288772292ca0',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'PARENT_COMMENT_NOT_FOUND',
      },
    });
    expect(commentsRepository.findOneBy).toHaveBeenCalledWith({
      id: '1b635eab-83fc-42b9-86e8-288772292ca0',
      postId: '292bbd98-e066-4550-9dbc-bb2debc54468',
    });
  });
});
