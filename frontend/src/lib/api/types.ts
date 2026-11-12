// Types calqués sur les DTO publics du back (src/modules/*/domain/*.types.ts) :
// ne rien ajouter que le back ne renvoie pas.

export type Specialty = 'FRONT_END' | 'BACK_END' | 'FULL_STACK' | 'MOBILE' | 'DATA_AI' | 'DEVOPS';
export type Level = 'LEARNING' | 'JUNIOR' | 'CONFIRMED' | 'SENIOR';
export type PostType = 'ARTICLE' | 'QUESTION' | 'PROJECT_LAUNCH';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio: string | null;
  avatarUrl: string | null;
  githubUrl: string | null;
  specialty: Specialty | null;
  experienceLevel: Level | null;
  interests: string[];
  technologies: string[];
  createdAt: string;
}

export interface UserPage {
  items: User[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export type Author = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;

export interface Media {
  id: string;
  resourceType: 'image' | 'video';
  format: string;
  bytes: number;
  url: string;
}
export interface Notification {
  id: string;
  type: 'MENTION';
  actor: User;
  message: string;
  postId: string | null;
  commentId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  type: PostType;
  content: string;
  codeSnippet: string | null;
  tags: string[];
  isDraft: boolean;
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  mentions: string[];
  attachments: Media[];
  author: Author;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  usefulCount: number;
  mentions: string[];
  author: Author;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'MAINTENANCE' | 'ARCHIVED';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  repositoryUrl: string | null;
  technologies: string[];
  isBeginnerFriendly: boolean;
  status: ProjectStatus;
  ownerId: string;
  owner: Author;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  isBeginnerFriendly: boolean;
  assignedUserId: string | null;
  assignedUser: Author | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string;
  user: Author;
  type: 'HELP_OFFERED' | 'CONTRIBUTION';
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface RepoPreview {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  htmlUrl: string;
}

export interface AuthResponse {
  expiresIn: number;
  user: User;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  resourceType: 'image' | 'video';
  uploadType: 'upload' | 'authenticated';
  maxBytes: number;
}
