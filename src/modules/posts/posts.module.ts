import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { MediaModule } from '../media/media.module.js';
import { UserEntity } from '../users/infrastructure/user.entity.js';
import { UserFollowEntity } from '../users/infrastructure/user-follow.entity.js';
import { CommentsService } from './application/comments.service.js';
import { PostsService } from './application/posts.service.js';
import { CommentEntity } from './infrastructure/comment.entity.js';
import { PostEntity } from './infrastructure/post.entity.js';
import { PostLikeEntity } from './infrastructure/post-like.entity.js';
import { PostMentionEntity } from './infrastructure/post-mention.entity.js';
import { CommentVoteEntity } from './infrastructure/comment-vote.entity.js';
import { CommentMentionEntity } from './infrastructure/comment-mention.entity.js';
import { QuestionFollowEntity } from './infrastructure/question-follow.entity.js';
import { PostsController } from './presentation/posts.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      CommentEntity,
      PostLikeEntity,
      PostMentionEntity,
      CommentVoteEntity,
      CommentMentionEntity,
      QuestionFollowEntity,
      UserEntity,
      UserFollowEntity,
    ]),
    SecurityModule,
    MediaModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, CommentsService],
})
export class PostsModule {}
