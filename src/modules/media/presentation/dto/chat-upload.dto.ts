import { IsEnum, IsUUID } from 'class-validator';
import { MediaResourceType } from '../../domain/media.types.js';

export class ChatUploadDto {
  @IsUUID('4')
  conversationId!: string;

  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;
}
