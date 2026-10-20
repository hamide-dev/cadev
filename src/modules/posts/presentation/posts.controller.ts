import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import type { PublicComment, PublicPost } from '../domain/post.types.js';
import { CommentsService } from '../application/comments.service.js';
import { PostsService } from '../application/posts.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

class FeedQueryDto {
  @IsOptional()
  @IsDateString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recent public posts' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Query() query: FeedQueryDto): Promise<PublicPost[]> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.postsService.list(query.cursor, limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePostDto,
  ): Promise<PublicPost> {
    return this.postsService.create(user, input);
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get a public post' })
  get(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicPost> {
    return this.postsService.getById(id);
  }

  @Patch(':postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: UpdatePostDto,
  ): Promise<PublicPost> {
    return this.postsService.update(id, user, input);
  }

  @Delete(':postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async delete(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ deleted: true }> {
    await this.postsService.delete(id, user);
    return { deleted: true };
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'List comments on a post over HTTP' })
  listComments(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
  ): Promise<PublicComment[]> {
    return this.commentsService.list(postId);
  }

  @Post(':postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post over HTTP' })
  createComment(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommentDto,
  ): Promise<PublicComment> {
    return this.commentsService.create(postId, user, input);
  }

  @Patch('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateComment(
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Body() input: UpdateCommentDto,
  ): Promise<PublicComment> {
    return this.commentsService.update(id, user, input);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteComment(
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ deleted: true }> {
    await this.commentsService.delete(id, user);
    return { deleted: true };
  }
}
