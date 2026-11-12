import {
  IsEnum,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MessageType } from '../../domain/messaging.types.js';

export class SendMessageDto {
  @IsUUID('4')
  conversationId!: string;

  @IsEnum(MessageType)
  type!: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsUUID('4')
  parentMessageId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
