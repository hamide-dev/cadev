import { IsUUID } from 'class-validator';

export class MessageIdDto {
  @IsUUID('4')
  messageId!: string;
}
