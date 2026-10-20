import type { PublicUser } from '../../users/domain/user.types.js';
import type { PublicPostMedia } from '../../media/domain/media.types.js';

export enum PostType {
  ARTICLE = 'ARTICLE',
  QUESTION = 'QUESTION',
  PROJECT_LAUNCH = 'PROJECT_LAUNCH',
}

export enum CommentSort {
  CHRONOLOGICAL = 'chronological',
  USEFUL = 'useful',
}

export interface PublicPost {
  id: string;
  type: PostType;
  content: string;
  codeSnippet: string | null;
  tags: string[];
  isDraft: boolean;
  isPinned: boolean;
  likeCount: number;
  likedByMe?: boolean;
  mentions: string[];
  attachments: PublicPostMedia[];
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  usefulCount: number;
  mentions: string[];
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  createdAt: string;
  updatedAt: string;
}
