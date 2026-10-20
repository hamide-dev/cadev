import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { CommentsService } from './application/comments.service.js';
import { PostsService } from './application/posts.service.js';
import { CommentEntity } from './infrastructure/comment.entity.js';
import { PostEntity } from './infrastructure/post.entity.js';
import { PostsController } from './presentation/posts.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, CommentEntity]),
    SecurityModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, CommentsService],
})
export class PostsModule {}
