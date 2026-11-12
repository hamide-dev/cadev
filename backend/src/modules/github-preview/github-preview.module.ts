import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubPreviewService } from './application/github-preview.service.js';
import { GitHubRepoPreviewEntity } from './infrastructure/github-repo-preview.entity.js';
import { GitHubPreviewController } from './presentation/github-preview.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([GitHubRepoPreviewEntity])],
  controllers: [GitHubPreviewController],
  providers: [GitHubPreviewService],
  exports: [GitHubPreviewService],
})
export class GitHubPreviewModule {}
