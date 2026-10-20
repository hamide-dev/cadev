import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../../database/is-unique-violation.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { MediaService } from '../../media/application/media.service.js';
import type { PublicPostMedia } from '../../media/domain/media.types.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { UserFollowEntity } from '../../users/infrastructure/user-follow.entity.js';
import { PostType, type PublicPost } from '../domain/post.types.js';
import { PostEntity } from '../infrastructure/post.entity.js';
import { PostLikeEntity } from '../infrastructure/post-like.entity.js';
import { PostMentionEntity } from '../infrastructure/post-mention.entity.js';
import { QuestionFollowEntity } from '../infrastructure/question-follow.entity.js';
import type { CreatePostDto } from '../presentation/dto/create-post.dto.js';
import type { UpdatePostDto } from '../presentation/dto/update-post.dto.js';

export interface PostPage {
  items: PublicPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface PostCursor {
  createdAt: Date;
  id?: string;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly likes: Repository<PostLikeEntity>,
    @InjectRepository(PostMentionEntity)
    private readonly mentions: Repository<PostMentionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserFollowEntity)
    private readonly follows: Repository<UserFollowEntity>,
    @InjectRepository(QuestionFollowEntity)
    private readonly questionFollows: Repository<QuestionFollowEntity>,
    private readonly mediaService: MediaService,
  ) {}

  async create(author: AuthUser, input: CreatePostDto): Promise<PublicPost> {
    const content = input.content?.trim() ?? '';
    if (!content && !input.isDraft) {
      throw new BadRequestException({
        code: 'POST_CONTENT_REQUIRED',
        message: 'Published posts require content.',
      });
    }
    const post = await this.posts.save(
      this.posts.create({
        type: input.type,
        content,
        codeSnippet: input.codeSnippet ?? null,
        tags: normalizeTags(input.tags ?? []),
        authorId: author.id,
        isDraft: input.isDraft ?? false,
        isPinned: false,
      }),
    );
    try {
      await this.mediaService.attachPostAssets(
        author.id,
        post.id,
        input.attachmentIds ?? [],
      );
      if (!post.isDraft) await this.syncMentions(post.id, post.content, post.codeSnippet);
    } catch (error) {
      await this.posts.delete({ id: post.id });
      throw error;
    }
    return this.getById(post.id, author.id);
  }

  async list(cursor?: string, limit = 20): Promise<PostPage> {
    return this.fetchPage(this.publicQuery(), cursor, limit);
  }

  async followingFeed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PostPage> {
    const query = this.publicQuery().innerJoin(
      UserFollowEntity,
      'follow',
      'follow.followedId = post.authorId AND follow.followerId = :userId',
      { userId },
    );
    return this.fetchPage(query, cursor, limit, userId);
  }

  async forYouFeed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PostPage> {
    const profile = await this.users.findOne({
      where: { id: userId },
      select: { id: true, interests: true, technologies: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    const preferences = normalizeTags([
      ...profile.interests,
      ...profile.technologies,
    ]);
    const query = this.publicQuery();
    if (preferences.length > 0) {
      query.andWhere('post.tags && CAST(:preferences AS varchar[])', {
        preferences,
      });
    }
    return this.fetchPage(query, cursor, limit, userId);
  }

  async listDrafts(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PostPage> {
    const query = this.postQuery()
      .where('post.authorId = :userId', { userId })
      .andWhere('post.isDraft = true');
    return this.fetchPage(query, cursor, limit, userId);
  }

  async listByUsername(
    username: string,
    cursor?: string,
    limit = 20,
  ): Promise<PostPage> {
    const query = this.publicQuery().andWhere(
      'author.username = :username',
      { username: username.toLowerCase().replace(/^@/, '') },
    );
    return this.fetchPage(query, cursor, limit);
  }

  async getById(id: string, viewerId?: string): Promise<PublicPost> {
    const post = await this.postQuery()
      .andWhere('post.id = :id', { id })
      .getOne();
    if (!post || (post.isDraft && post.authorId !== viewerId)) {
      throw this.postNotFound();
    }
    return (await this.mapPosts([post], viewerId))[0]!;
  }

  async update(
    id: string,
    user: AuthUser,
    input: UpdatePostDto,
  ): Promise<PublicPost> {
    const post = await this.findOwnedPost(id, user.id);
    const appendedAttachments = input.attachmentIds ?? [];
    if (
      appendedAttachments.length > 0 &&
      (await this.countPostAttachments(post.id)) + appendedAttachments.length > 5
    ) {
      throw new ConflictException({
        code: 'POST_ATTACHMENT_LIMIT',
        message: 'A post can have at most five attachments.',
      });
    }
    if (input.content !== undefined) post.content = input.content.trim();
    if (input.codeSnippet !== undefined)
      post.codeSnippet = input.codeSnippet ?? null;
    if (input.tags !== undefined) post.tags = normalizeTags(input.tags);
    if (input.isDraft !== undefined) post.isDraft = input.isDraft;
    if (!post.isDraft && !post.content) {
      throw new BadRequestException({
        code: 'POST_CONTENT_REQUIRED',
        message: 'Published posts require content.',
      });
    }
    await this.posts.save(post);
    await this.mediaService.attachPostAssets(
      user.id,
      post.id,
      appendedAttachments,
    );
    if (!post.isDraft)
      await this.syncMentions(post.id, post.content, post.codeSnippet);
    return this.getById(post.id, user.id);
  }

  async publish(id: string, user: AuthUser): Promise<PublicPost> {
    const post = await this.findOwnedPost(id, user.id);
    if (!post.content.trim()) {
      throw new BadRequestException({
        code: 'POST_CONTENT_REQUIRED',
        message: 'Add content before publishing this draft.',
      });
    }
    post.isDraft = false;
    await this.posts.save(post);
    await this.syncMentions(post.id, post.content, post.codeSnippet);
    return this.getById(post.id, user.id);
  }

  async delete(id: string, user: AuthUser): Promise<void> {
    const post = await this.findOwnedPost(id, user.id);
    await this.posts.remove(post);
  }

  async like(id: string, userId: string): Promise<{ liked: true }> {
    const post = await this.findPublishedPost(id);
    try {
      await this.likes.save(this.likes.create({ userId, postId: post.id }));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return { liked: true };
  }

  async unlike(id: string, userId: string): Promise<{ liked: false }> {
    const post = await this.findPublishedPost(id);
    await this.likes.delete({ userId, postId: post.id });
    return { liked: false };
  }

  async pin(id: string, userId: string): Promise<{ pinned: true }> {
    const post = await this.findOwnedPost(id, userId);
    if (post.isDraft) throw this.postNotFound();
    await this.posts.update(
      { authorId: userId, isPinned: true },
      { isPinned: false },
    );
    await this.posts.update({ id: post.id }, { isPinned: true });
    return { pinned: true };
  }

  async unpin(id: string, userId: string): Promise<{ pinned: false }> {
    const post = await this.findOwnedPost(id, userId);
    await this.posts.update({ id: post.id }, { isPinned: false });
    return { pinned: false };
  }

  async followQuestion(
    id: string,
    userId: string,
  ): Promise<{ following: true }> {
    const post = await this.findQuestion(id);
    try {
      await this.questionFollows.save(
        this.questionFollows.create({ userId, postId: post.id }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return { following: true };
  }

  async unfollowQuestion(
    id: string,
    userId: string,
  ): Promise<{ following: false }> {
    const post = await this.findQuestion(id);
    await this.questionFollows.delete({ userId, postId: post.id });
    return { following: false };
  }

  private publicQuery() {
    return this.postQuery().where('post.isDraft = false');
  }

  private postQuery() {
    return this.posts
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.mentions', 'mention')
      .leftJoinAndSelect('mention.user', 'mentionedUser')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC');
  }

  private async fetchPage(
    query: ReturnType<PostsService['postQuery']>,
    cursor: string | undefined,
    limit: number,
    viewerId?: string,
  ): Promise<PostPage> {
    const parsedCursor = decodeCursor(cursor);
    if (parsedCursor) {
      if (parsedCursor.id) {
        query.andWhere(
          '(post.createdAt, post.id) < (:cursorDate, :cursorId)',
          { cursorDate: parsedCursor.createdAt, cursorId: parsedCursor.id },
        );
      } else {
        query.andWhere('post.createdAt < :cursorDate', {
          cursorDate: parsedCursor.createdAt,
        });
      }
    }
    const entities = await query.take(limit + 1).getMany();
    const hasMore = entities.length > limit;
    const pageEntities = entities.slice(0, limit);
    const items = await this.mapPosts(pageEntities, viewerId);
    const lastPost = pageEntities.at(-1);
    return {
      items,
      nextCursor:
        hasMore && lastPost
          ? encodeCursor(lastPost.createdAt, lastPost.id)
          : null,
      hasMore,
    };
  }

  private async mapPosts(
    posts: PostEntity[],
    viewerId?: string,
  ): Promise<PublicPost[]> {
    if (posts.length === 0) return [];
    const ids = posts.map((post) => post.id);
    const [attachments, viewerLikes, likeCounts] = await Promise.all([
      this.mediaService.getPublicPostAttachments(ids),
      viewerId ? this.likes.find({ where: { userId: viewerId, postId: In(ids) } }) : [],
      this.likes
        .createQueryBuilder('like')
        .select('like.postId', 'postId')
        .addSelect('COUNT(*)', 'count')
        .where('like.postId IN (:...ids)', { ids })
        .groupBy('like.postId')
        .getRawMany<{ postId: string; count: string }>(),
    ]);
    const likedIds = new Set(viewerLikes.map((like) => like.postId));
    const counts = new Map(
      likeCounts.map((entry) => [entry.postId, Number(entry.count)]),
    );
    return posts.map((post) =>
      mapPost(
        post,
        attachments.get(post.id) ?? [],
        viewerId ? likedIds.has(post.id) : undefined,
        counts.get(post.id) ?? 0,
      ),
    );
  }

  private async countPostAttachments(postId: string): Promise<number> {
    const attachments = await this.mediaService.getPublicPostAttachments([postId]);
    return attachments.get(postId)?.length ?? 0;
  }

  private async syncMentions(
    postId: string,
    content: string,
    codeSnippet: string | null,
  ): Promise<void> {
    const handles = extractMentionHandles(`${content}\n${codeSnippet ?? ''}`);
    await this.mentions.delete({ postId });
    if (handles.length === 0) return;
    const users = await this.users.find({
      where: { username: In(handles) },
      select: { id: true },
    });
    if (users.length === 0) return;
    await this.mentions.save(
      users.map((user) => this.mentions.create({ postId, userId: user.id })),
    );
  }

  private async findOwnedPost(id: string, userId: string): Promise<PostEntity> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw this.postNotFound();
    if (post.authorId !== userId) {
      throw new ForbiddenException({
        code: 'POST_ACCESS_DENIED',
        message: 'You cannot modify this post.',
      });
    }
    return post;
  }

  private async findPublishedPost(id: string): Promise<PostEntity> {
    const post = await this.posts.findOneBy({ id, isDraft: false });
    if (!post) throw this.postNotFound();
    return post;
  }

  private async findQuestion(id: string): Promise<PostEntity> {
    const post = await this.posts.findOneBy({
      id,
      isDraft: false,
      type: PostType.QUESTION,
    });
    if (!post) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Technical question not found.',
      });
    }
    return post;
  }

  private postNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'POST_NOT_FOUND',
      message: 'Post not found.',
    });
  }
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function extractMentionHandles(content: string): string[] {
  return [
    ...new Set(
      [...content.matchAll(/(?:^|\s)@([A-Za-z0-9_]{3,20})\b/g)].map((match) =>
        match[1]!.toLowerCase(),
      ),
    ),
  ];
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

function decodeCursor(cursor?: string): PostCursor | undefined {
  if (!cursor) return undefined;
  let decoded = cursor;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(cursor)) {
    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new ConflictException({
        code: 'INVALID_POST_CURSOR',
        message: 'The post cursor is invalid.',
      });
    }
  }
  const [date, id, extra] = decoded.split('|');
  const createdAt = new Date(date!);
  if (
    !date ||
    Number.isNaN(createdAt.getTime()) ||
    extra !== undefined ||
    (id !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ))
  ) {
    throw new ConflictException({
      code: 'INVALID_POST_CURSOR',
      message: 'The post cursor is invalid.',
    });
  }
  return { createdAt, ...(id ? { id } : {}) };
}

function mapPost(
  post: PostEntity,
  attachments: PublicPostMedia[],
  likedByMe: boolean | undefined,
  likeCount: number,
): PublicPost {
  if (!post.author) {
    throw new Error('Post author must be loaded to map a public post');
  }
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    codeSnippet: post.codeSnippet,
    tags: post.tags,
    isDraft: post.isDraft,
    isPinned: post.isPinned,
    likeCount,
    ...(likedByMe === undefined ? {} : { likedByMe }),
    mentions: (post.mentions ?? []).map((mention) => mention.user.username),
    attachments,
    author: {
      id: post.author.id,
      username: post.author.username,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
    },
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
