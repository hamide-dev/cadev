import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import type { PublicComment } from '../domain/post.types.js';
import { CommentEntity } from '../infrastructure/comment.entity.js';
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
  ) {}

  async list(postId: string, limit = 50): Promise<PublicComment[]> {
    if (!(await this.posts.existsBy({ id: postId }))) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found.',
      });
    }
    const comments = await this.comments.find({
      where: { postId },
      relations: { author: true },
      order: { createdAt: 'ASC', id: 'ASC' },
      take: limit,
    });
    return comments.map(mapComment);
  }

  async create(
    postId: string,
    author: AuthUser,
    input: CreateCommentDto,
  ): Promise<PublicComment> {
    if (!(await this.posts.existsBy({ id: postId }))) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found.',
      });
    }
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
    return mapComment(
      await this.comments.findOneOrFail({
        where: { id: saved.id },
        relations: { author: true },
      }),
    );
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
    return mapComment(await this.findEntity(id, true));
  }

  async delete(id: string, user: AuthUser): Promise<void> {
    const comment = await this.findEntity(id);
    if (comment.authorId !== user.id) throw new ForbiddenException();
    await this.comments.remove(comment);
  }

  private async findEntity(
    id: string,
    withAuthor = false,
  ): Promise<CommentEntity> {
    const comment = await this.comments.findOne({
      where: { id },
      relations: withAuthor ? { author: true } : undefined,
    });
    if (!comment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found.',
      });
    }
    return comment;
  }
}

function mapComment(comment: CommentEntity): PublicComment {
  if (!comment.author) {
    throw new Error('Comment author must be loaded to map a public comment');
  }
  return {
    id: comment.id,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    content: comment.content,
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
