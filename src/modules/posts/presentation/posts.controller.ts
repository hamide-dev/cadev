import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import {
  CommentSort,
  type PublicComment,
  type PublicPost,
} from '../domain/post.types.js';
import { CommentsService } from '../application/comments.service.js';
import { PostsService } from '../application/posts.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

class FeedQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

class CommentListQueryDto {
  @IsOptional()
  @IsEnum(CommentSort)
  sort?: CommentSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
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
  list(@Query() query: FeedQueryDto) {
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

  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a post draft' })
  createDraft(
    @CurrentUser() user: AuthUser,
    @Body() input: CreatePostDto,
  ): Promise<PublicPost> {
    input.isDraft = true;
    return this.postsService.create(user, input);
  }

  @Get('drafts/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the authenticated developer drafts' })
  listDrafts(
    @CurrentUser() user: AuthUser,
    @Query() query: FeedQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.postsService.listDrafts(user.id, query.cursor, limit);
  }

  @Get('feed/following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the chronological feed of followed authors' })
  followingFeed(
    @CurrentUser() user: AuthUser,
    @Query() query: FeedQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.postsService.followingFeed(user.id, query.cursor, limit);
  }

  @Get('feed/for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a feed filtered by profile interests' })
  forYouFeed(
    @CurrentUser() user: AuthUser,
    @Query() query: FeedQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.postsService.forYouFeed(user.id, query.cursor, limit);
  }

  @Get('users/:username')
  @ApiOperation({ summary: 'List public posts from a developer profile' })
  listByUsername(
    @Param('username') username: string,
    @Query() query: FeedQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    return this.postsService.listByUsername(username, query.cursor, limit);
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

  @Post(':postId/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish one of your drafts' })
  publish(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PublicPost> {
    return this.postsService.publish(id, user);
  }

  @Put(':postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a published post' })
  like(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ liked: true }> {
    return this.postsService.like(id, user.id);
  }

  @Delete(':postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your like from a post' })
  unlike(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ liked: false }> {
    return this.postsService.unlike(id, user.id);
  }

  @Put(':postId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin a post to your profile' })
  pin(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ pinned: true }> {
    return this.postsService.pin(id, user.id);
  }

  @Delete(':postId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin a post from your profile' })
  unpin(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ pinned: false }> {
    return this.postsService.unpin(id, user.id);
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
    @Query() query: CommentListQueryDto,
  ): Promise<PublicComment[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    return this.commentsService.list(
      postId,
      limit,
      query.sort ?? CommentSort.CHRONOLOGICAL,
    );
  }

  @Get(':postId/answers')
  @ApiOperation({ summary: 'List answers to a technical question' })
  listAnswers(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @Query() query: CommentListQueryDto,
  ): Promise<PublicComment[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    return this.commentsService.listAnswers(
      postId,
      limit,
      query.sort ?? CommentSort.USEFUL,
    );
  }

  @Post(':postId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Answer a technical question over HTTP' })
  createAnswer(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @CurrentUser() user: AuthUser,
    @Body() input: CreateCommentDto,
  ): Promise<PublicComment> {
    return this.commentsService.createAnswer(postId, user, input);
  }

  @Put('comments/:commentId/useful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark an answer useful' })
  markUseful(
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ useful: true }> {
    return this.commentsService.markUseful(commentId, user.id);
  }

  @Delete('comments/:commentId/useful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your useful vote from an answer' })
  unmarkUseful(
    @Param('commentId', new ParseUUIDPipe({ version: '4' })) commentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ useful: false }> {
    return this.commentsService.unmarkUseful(commentId, user.id);
  }

  @Put(':postId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a technical question' })
  followQuestion(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ following: true }> {
    return this.postsService.followQuestion(postId, user.id);
  }

  @Delete(':postId/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a technical question' })
  unfollowQuestion(
    @Param('postId', new ParseUUIDPipe({ version: '4' })) postId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ following: false }> {
    return this.postsService.unfollowQuestion(postId, user.id);
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
