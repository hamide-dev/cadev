import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { LinkPreviewService, type LinkPreview } from './link-preview.service.js';

class LinkPreviewQueryDto {
  @IsString()
  @MaxLength(2048)
  url!: string;
}

@ApiTags('link-preview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly previews: LinkPreviewService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Title, description and image of a public web page (messages, posts)' })
  @ApiQuery({ name: 'url', required: true })
  get(@Query() query: LinkPreviewQueryDto): Promise<LinkPreview> {
    return this.previews.getPreview(query.url);
  }
}
