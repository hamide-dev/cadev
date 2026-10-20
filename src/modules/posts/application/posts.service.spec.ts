import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaService } from '../../media/application/media.service.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { UserFollowEntity } from '../../users/infrastructure/user-follow.entity.js';
import { PostEntity } from '../infrastructure/post.entity.js';
import { PostLikeEntity } from '../infrastructure/post-like.entity.js';
import { PostMentionEntity } from '../infrastructure/post-mention.entity.js';
import { QuestionFollowEntity } from '../infrastructure/question-follow.entity.js';
import { PostType } from '../domain/post.types.js';
import { PostsService } from './posts.service.js';

describe('PostsService', () => {
  function createService(overrides: {
    posts?: Record<string, ReturnType<typeof vi.fn>>;
    likes?: Record<string, ReturnType<typeof vi.fn>>;
  } = {}) {
    const posts = {
      create: vi.fn((value: object) => value),
      save: vi.fn(),
      delete: vi.fn(),
      findOneBy: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
      ...overrides.posts,
    };
    const likes = {
      create: vi.fn((value: object) => value),
      save: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
      ...overrides.likes,
    };
    const mentions = {
      delete: vi.fn(),
      save: vi.fn(),
      create: vi.fn((value: object) => value),
    };
    const users = { find: vi.fn(), findOne: vi.fn() };
    const follows = { find: vi.fn() };
    const questionFollows = {
      create: vi.fn((value: object) => value),
      save: vi.fn(),
      delete: vi.fn(),
    };
    const media = {
      attachPostAssets: vi.fn(),
      getPublicPostAttachments: vi.fn(),
    };
    const module = Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(PostEntity), useValue: posts },
        { provide: getRepositoryToken(PostLikeEntity), useValue: likes },
        { provide: getRepositoryToken(PostMentionEntity), useValue: mentions },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: getRepositoryToken(UserFollowEntity), useValue: follows },
        {
          provide: getRepositoryToken(QuestionFollowEntity),
          useValue: questionFollows,
        },
        { provide: MediaService, useValue: media },
      ],
    });
    return module.compile().then((compiled) => ({
      service: compiled.get(PostsService),
      posts,
      likes,
      questionFollows,
      media,
    }));
  }

  it('does not persist an empty published post', async () => {
    const { service, posts } = await createService();

    await expect(
      service.create(
        { id: 'author-id', email: 'dev@example.test' },
        { type: PostType.ARTICLE, content: '' },
      ),
    ).rejects.toMatchObject({
      response: { code: 'POST_CONTENT_REQUIRED' },
    });
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('treats a duplicate like as an idempotent success', async () => {
    const { service, posts, likes } = await createService({
      posts: {
        findOneBy: vi.fn().mockResolvedValue({
          id: 'post-id',
          isDraft: false,
        }),
      },
      likes: {
        save: vi.fn().mockRejectedValue({ code: '23505' }),
      },
    });

    await expect(service.like('post-id', 'user-id')).resolves.toEqual({
      liked: true,
    });
    expect(posts.findOneBy).toHaveBeenCalledWith({
      id: 'post-id',
      isDraft: false,
    });
    expect(likes.save).toHaveBeenCalledWith({
      userId: 'user-id',
      postId: 'post-id',
    });
  });

  it('follows only published technical questions', async () => {
    const { service, posts, questionFollows } = await createService({
      posts: {
        findOneBy: vi.fn().mockResolvedValue({
          id: 'question-id',
          isDraft: false,
          type: PostType.QUESTION,
        }),
      },
    });

    await expect(
      service.followQuestion('question-id', 'user-id'),
    ).resolves.toEqual({ following: true });
    expect(posts.findOneBy).toHaveBeenCalledWith({
      id: 'question-id',
      isDraft: false,
      type: PostType.QUESTION,
    });
    expect(questionFollows.save).toHaveBeenCalledWith({
      userId: 'user-id',
      postId: 'question-id',
    });
  });

  it('rejects following a non-question post', async () => {
    const { service, questionFollows } = await createService({
      posts: {
        findOneBy: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.followQuestion('post-id', 'user-id'),
    ).rejects.toMatchObject({
      response: { code: 'QUESTION_NOT_FOUND' },
    });
    expect(questionFollows.save).not.toHaveBeenCalled();
  });
});
