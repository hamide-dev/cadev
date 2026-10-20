import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';
import { MediaResourceType } from '../../domain/media.types.js';

export class ConfirmChatUploadDto {
  @IsUUID('4')
  conversationId!: string;

  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;

  @IsString()
  @MaxLength(512)
  publicId!: string;
}
