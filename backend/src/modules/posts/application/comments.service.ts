import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../../database/is-unique-violation.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { CommentSort, PostType } from '../domain/post.types.js';
import type { PublicComment } from '../domain/post.types.js';
import { CommentEntity } from '../infrastructure/comment.entity.js';
import { CommentMentionEntity } from '../infrastructure/comment-mention.entity.js';
import { CommentVoteEntity } from '../infrastructure/comment-vote.entity.js';
import { PostEntity } from '../infrastructure/post.entity.js';
import type { CreateCommentDto } from '../presentation/dto/create-comment.dto.js';
import type { UpdateCommentDto } from '../presentation/dto/update-comment.dto.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly comments: Repository<CommentEntity>,
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
    @InjectRepository(CommentVoteEntity)
    private readonly votes: Repository<CommentVoteEntity>,
    @InjectRepository(CommentMentionEntity)
    private readonly mentions: Repository<CommentMentionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async list(
    postId: string,
    limit = 50,
    sort = CommentSort.CHRONOLOGICAL,
  ): Promise<PublicComment[]> {
    if (!(await this.posts.existsBy({ id: postId }))) {
      throw this.postNotFound();
    }
    const comments = await this.comments.find({
      where: { postId },
      relations: { author: true },
      order: { createdAt: 'ASC', id: 'ASC' },
      take: limit,
    });
    return this.mapComments(comments, sort);
  }

  async listAnswers(
    postId: string,
    limit = 50,
    sort = CommentSort.USEFUL,
  ): Promise<PublicComment[]> {
    await this.assertQuestion(postId);
    return this.list(postId, limit, sort);
  }

  async create(
    postId: string,
    author: AuthUser,
    input: CreateCommentDto,
  ): Promise<PublicComment> {
    await this.assertPostExists(postId);
    return this.createForPost(postId, author, input);
  }

  async createAnswer(
    postId: string,
    author: AuthUser,
    input: CreateCommentDto,
  ): Promise<PublicComment> {
    await this.assertQuestion(postId);
    return this.createForPost(postId, author, input);
  }

  async markUseful(
    commentId: string,
    userId: string,
  ): Promise<{ useful: true }> {
    const comment = await this.findEntity(commentId);
    await this.assertQuestion(comment.postId);
    try {
      await this.votes.save(
        this.votes.create({ userId, commentId: comment.id }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return { useful: true };
  }

  async unmarkUseful(
    commentId: string,
    userId: string,
  ): Promise<{ useful: false }> {
    const comment = await this.findEntity(commentId);
    await this.assertQuestion(comment.postId);
    await this.votes.delete({ userId, commentId });
    return { useful: false };
  }

  async update(
    id: string,
    user: AuthUser,
    input: UpdateCommentDto,
  ): Promise<PublicComment> {
    const comment = await this.findEntity(id);
    if (comment.authorId !== user.id) throw new ForbiddenException();
    comment.content = input.content.trim();
    await this.comments.save(comment);
    await this.syncMentions(comment.id, comment.content);
    const updated = await this.comments.findOneOrFail({
      where: { id: comment.id },
      relations: { author: true },
    });
    return (await this.mapComments([updated]))[0]!;
  }

  async delete(id: string, user: AuthUser): Promise<void> {
    const comment = await this.findEntity(id);
    if (comment.authorId !== user.id) throw new ForbiddenException();
    await this.comments.remove(comment);
  }

  private async createForPost(
    postId: string,
    author: AuthUser,
    input: CreateCommentDto,
  ): Promise<PublicComment> {
    const parentCommentId = input.parentCommentId ?? null;
    if (parentCommentId) {
      const parent = await this.comments.findOneBy({
        id: parentCommentId,
        postId,
      });
      if (!parent) {
        throw new NotFoundException({
          code: 'PARENT_COMMENT_NOT_FOUND',
          message: 'Parent comment does not belong to this post.',
        });
      }
    }
    const comment = this.comments.create({
      postId,
      authorId: author.id,
      parentCommentId,
      content: input.content.trim(),
    });
    const saved = await this.comments.save(comment);
    await this.syncMentions(saved.id, saved.content);
    const mapped = await this.comments.findOneOrFail({
      where: { id: saved.id },
      relations: { author: true },
    });
    return (await this.mapComments([mapped]))[0]!;
  }

  private async mapComments(
    comments: CommentEntity[],
    sort = CommentSort.CHRONOLOGICAL,
  ): Promise<PublicComment[]> {
    if (comments.length === 0) return [];
    const ids = comments.map((comment) => comment.id);
    const [counts, mentions] = await Promise.all([
      this.votes
        .createQueryBuilder('vote')
        .select('vote.commentId', 'commentId')
        .addSelect('COUNT(*)', 'count')
        .where('vote.commentId IN (:...ids)', { ids })
        .groupBy('vote.commentId')
        .getRawMany<{ commentId: string; count: string }>(),
      this.mentions.find({
        where: { commentId: In(ids) },
        relations: { user: true },
      }),
    ]);
    const countById = new Map(
      counts.map((entry) => [entry.commentId, Number(entry.count)]),
    );
    const mentionsById = new Map<string, string[]>();
    for (const mention of mentions) {
      const handles = mentionsById.get(mention.commentId) ?? [];
      handles.push(mention.user.username);
      mentionsById.set(mention.commentId, handles);
    }
    const mapped = comments.map((comment) =>
      mapComment(
        comment,
        countById.get(comment.id) ?? 0,
        mentionsById.get(comment.id) ?? [],
      ),
    );
    if (sort === CommentSort.USEFUL) {
      mapped.sort(
        (left, right) =>
          right.usefulCount - left.usefulCount ||
          left.createdAt.localeCompare(right.createdAt) ||
          left.id.localeCompare(right.id),
      );
    }
    return mapped;
  }

  private async syncMentions(
    commentId: string,
    content: string,
  ): Promise<void> {
    const handles = extractMentionHandles(content);
    await this.mentions.delete({ commentId });
    if (handles.length === 0) return;
    const users = await this.users.find({
      where: { username: In(handles) },
      select: { id: true },
    });
    if (users.length > 0) {
      await this.mentions.save(
        users.map((user) =>
          this.mentions.create({ commentId, userId: user.id }),
        ),
      );
    }
  }

  private async assertPostExists(postId: string): Promise<void> {
    if (!(await this.posts.existsBy({ id: postId, isDraft: false }))) {
      throw this.postNotFound();
    }
  }

  private async assertQuestion(postId: string): Promise<void> {
    const post = await this.posts.findOneBy({ id: postId, isDraft: false });
    if (!post) throw this.postNotFound();
    if (post.type !== PostType.QUESTION) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Technical question not found.',
      });
    }
  }

  private async findEntity(id: string): Promise<CommentEntity> {
    const comment = await this.comments.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found.',
      });
    }
    return comment;
  }

  private postNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'POST_NOT_FOUND',
      message: 'Post not found.',
    });
  }
}

function extractMentionHandles(content: string): string[] {
  return [
    ...new Set(
      [...content.matchAll(/(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,20})\b/g)].map(
        (match) => match[1]!.toLowerCase(),
      ),
    ),
  ];
}

function mapComment(
  comment: CommentEntity,
  usefulCount: number,
  mentions: string[],
): PublicComment {
  if (!comment.author) {
    throw new Error('Comment author must be loaded to map a public comment');
  }
  return {
    id: comment.id,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    content: comment.content,
    usefulCount,
    mentions,
    author: {
      id: comment.author.id,
      username: comment.author.username,
      displayName: comment.author.displayName,
      avatarUrl: comment.author.avatarUrl,
    },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
