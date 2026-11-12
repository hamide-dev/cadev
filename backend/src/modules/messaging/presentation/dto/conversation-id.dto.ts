import { IsUUID } from 'class-validator';

export class ConversationIdDto {
  @IsUUID('4')
  conversationId!: string;
}
