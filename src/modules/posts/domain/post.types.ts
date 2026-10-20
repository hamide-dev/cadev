import type { PublicUser } from '../../users/domain/user.types.js';

export enum PostType {
  ARTICLE = 'ARTICLE',
  QUESTION = 'QUESTION',
  PROJECT_LAUNCH = 'PROJECT_LAUNCH',
}

export interface PublicPost {
  id: string;
  type: PostType;
  content: string;
  codeSnippet: string | null;
  tags: string[];
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  createdAt: string;
  updatedAt: string;
}
