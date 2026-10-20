import type { PublicUser } from '../../users/domain/user.types.js';

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export enum MessageType {
  TEXT = 'TEXT',
  CODE = 'CODE',
  LINK = 'LINK',
  MEDIA = 'MEDIA',
}

export interface PublicConversation {
  id: string;
  type: ConversationType;
  name: string | null;
  members: Array<Pick<PublicUser, 'id' | 'username' | 'displayName'>>;
  createdAt: string;
}

export interface PublicMessage {
  id: string;
  conversationId: string;
  sender: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  type: MessageType;
  content: string;
  parentMessageId: string | null;
  attachments: import('../../media/domain/media.types.js').PublicMessageMedia[];
  createdAt: string;
}
