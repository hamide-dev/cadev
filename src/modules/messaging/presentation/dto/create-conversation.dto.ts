import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ConversationType } from '../../domain/messaging.types.js';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type!: ConversationType;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(29)
  @IsUUID('4', { each: true })
  memberIds!: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
