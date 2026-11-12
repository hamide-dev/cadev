import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { MediaResourceType } from '../../domain/media.types.js';

export class PostUploadDto {
  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;
}

export class ConfirmPostUploadDto {
  @IsString()
  @MaxLength(512)
  @Matches(/^hello-world\/posts\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/)
  publicId!: string;

  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;
}
