import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import type { PublicPost } from '../domain/post.types.js';
import { PostEntity } from '../infrastructure/post.entity.js';
import type { CreatePostDto } from '../presentation/dto/create-post.dto.js';
import type { UpdatePostDto } from '../presentation/dto/update-post.dto.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
  ) {}

  async create(author: AuthUser, input: CreatePostDto): Promise<PublicPost> {
    const post = this.posts.create({
      type: input.type,
      content: input.content.trim(),
      codeSnippet: input.codeSnippet ?? null,
      tags: normalizeTags(input.tags ?? []),
      authorId: author.id,
    });
    const saved = await this.posts.save(post);
    const created = await this.posts.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });
    if (!created) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'The saved post could not be loaded.',
      });
    }
    return mapPost(created);
  }

  async list(cursor?: string, limit = 20): Promise<PublicPost[]> {
    const query = this.posts
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(limit);
    if (cursor) {
      query.andWhere('post.createdAt < :cursor', { cursor });
    }
    const posts = await query.getMany();
    return posts.map(mapPost);
  }

  async getById(id: string): Promise<PublicPost> {
    const post = await this.posts.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found.',
      });
    }
    return mapPost(post);
  }

  async update(
    id: string,
    user: AuthUser,
    input: UpdatePostDto,
  ): Promise<PublicPost> {
    const post = await this.findEntity(id);
    if (post.authorId !== user.id) {
      throw new ForbiddenException();
    }
    if (input.content !== undefined) post.content = input.content.trim();
    if (input.codeSnippet !== undefined)
      post.codeSnippet = input.codeSnippet ?? null;
    if (input.tags !== undefined) post.tags = normalizeTags(input.tags);
    const saved = await this.posts.save(post);
    const updated = await this.posts.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });
    if (!updated) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found.',
      });
    }
    return mapPost(updated);
  }

  async delete(id: string, user: AuthUser): Promise<void> {
    const post = await this.findEntity(id);
    if (post.authorId !== user.id) {
      throw new ForbiddenException();
    }
    await this.posts.remove(post);
  }

  private async findEntity(id: string): Promise<PostEntity> {
    const post = await this.posts.findOneBy({ id });
    if (!post) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found.',
      });
    }
    return post;
  }
}

function normalizeTags(tags: string[]): string[] {
  return [
    ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ];
}

function mapPost(post: PostEntity): PublicPost {
  if (!post.author) {
    throw new Error('Post author must be loaded to map a public post');
  }
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    codeSnippet: post.codeSnippet,
    tags: post.tags,
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
