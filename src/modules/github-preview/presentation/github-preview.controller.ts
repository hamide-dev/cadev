import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { GitHubRepoPreview } from '../domain/github-preview.types.js';
import { GitHubPreviewService } from '../application/github-preview.service.js';

class GitHubPreviewQueryDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}

@ApiTags('github-preview')
@Controller('github-preview')
export class GitHubPreviewController {
  constructor(private readonly previewService: GitHubPreviewService) {}

  @Get()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get cached metadata for a public GitHub repo' })
  @ApiQuery({ name: 'url', required: true })
  getPreview(
    @Query() query: GitHubPreviewQueryDto,
  ): Promise<GitHubRepoPreview> {
    return this.previewService.getPreview(query.url);
  }
}
