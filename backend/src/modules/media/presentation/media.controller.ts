import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import type { UploadSignature } from '../domain/media.types.js';
import { MediaService } from '../application/media.service.js';
import { ConfirmProfileUploadDto } from './dto/confirm-profile-upload.dto.js';
import {
  ConfirmPostUploadDto,
  PostUploadDto,
} from './dto/post-upload.dto.js';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('profile/signature')
  @ApiOperation({ summary: 'Get a signed Cloudinary profile-image upload' })
  createProfileSignature(@CurrentUser() user: AuthUser): UploadSignature {
    return this.mediaService.createProfileImageSignature(user.id);
  }

  @Post('profile/confirm')
  @ApiOperation({
    summary: 'Verify a Cloudinary upload and set the profile image',
  })
  confirmProfileUpload(
    @CurrentUser() user: AuthUser,
    @Body() input: ConfirmProfileUploadDto,
  ): Promise<{ avatarUrl: string }> {
    return this.mediaService.confirmProfileImage(user.id, input.publicId);
  }

  @Post('banner/signature')
  @ApiOperation({ summary: 'Get a signed Cloudinary profile-banner upload' })
  createBannerSignature(@CurrentUser() user: AuthUser): UploadSignature {
    return this.mediaService.createBannerSignature(user.id);
  }

  @Post('banner/confirm')
  @ApiOperation({
    summary: 'Verify a Cloudinary upload and set the profile banner',
  })
  confirmBannerUpload(
    @CurrentUser() user: AuthUser,
    @Body() input: ConfirmProfileUploadDto,
  ): Promise<{ bannerUrl: string }> {
    return this.mediaService.confirmBannerUpload(user.id, input.publicId);
  }

  @Post('posts/signature')
  @ApiOperation({ summary: 'Get a signed Cloudinary post-media upload' })
  createPostSignature(
    @CurrentUser() user: AuthUser,
    @Body() input: PostUploadDto,
  ): UploadSignature {
    return this.mediaService.createPostUploadSignature(
      user.id,
      input.resourceType,
    );
  }

  @Post('posts/confirm')
  @ApiOperation({ summary: 'Verify a Cloudinary post-media upload' })
  confirmPostUpload(
    @CurrentUser() user: AuthUser,
    @Body() input: ConfirmPostUploadDto,
  ) {
    return this.mediaService.confirmPostUpload(
      user.id,
      input.publicId,
      input.resourceType,
    );
  }
}
