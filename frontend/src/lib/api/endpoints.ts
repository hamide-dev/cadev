import type { AuthResponse, Comment, Contribution, Media, Notification, Page, Post, PostType, Project, RepoPreview, Task, UploadSignature, User, UserPage } from './types';
import { BASE, qs, request } from './client';
export const api = {
  // Auth — nouveau flux en deux phases
  /** Étape 1 : valide nom + e-mail et envoie l'OTP de vérification */
  initRegistration: (input: { email: string; displayName: string }) =>
    request<{ message: string; email: string; expiresIn: number }>('POST', '/auth/register/init', input),
  /** Étape 1 suite : valide l'OTP reçu par e-mail (ne crée pas encore le compte) */
  verifyInitOtp: (email: string, code: string) =>
    request<{ emailVerified: true; email: string }>('POST', '/auth/email/verify', { email, code }),
  /** Vérifie la disponibilité d'un username avant finalisation */
  checkUsername: (username: string) =>
    request<{ available: boolean }>('GET', `/auth/register/username/${encodeURIComponent(username)}`),
  /** Étape 2 : finalise le compte avec username + password */
  completeRegistration: (input: { email: string; username: string; password: string }) =>
    request<AuthResponse>('POST', '/auth/register/complete', input),
  // Flux legacy (conservé pour compatibilité)
  register: (input: { email: string; username: string; displayName: string; password: string }) =>
    request<{ message: string; email: string; expiresIn: number }>('POST', '/auth/register', input),
  verifyEmail: (email: string, code: string) => request<AuthResponse>('POST', '/auth/email/verify', { email, code }),
  resendVerification: (email: string) => request<{ message: string }>('POST', '/auth/email/resend', { email }),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  logout: () => request<{ success: true }>('POST', '/auth/logout'),
  requestPasswordReset: (email: string) => request<{ message: string; email: string; expiresIn: number }>('POST', '/auth/password/forgot', { email }),
  resetPassword: (email: string, code: string, password: string) =>
    request<{ message: string }>('POST', '/auth/password/reset', { email, code, password }),
  requestLoginCode: (email: string) => request<{ message: string }>('POST', '/auth/login/code', { email }),
  verifyLoginCode: (email: string, code: string) => request<AuthResponse>('POST', '/auth/login/verify', { email, code }),
  oauthUrl: (provider: 'google' | 'github') => `${BASE}/auth/${provider}`,

  // Utilisateurs
  me: () => request<User>('GET', '/users/me'),
  followingUsers: () => request<{ usernames: string[] }>('GET', '/users/following'),
  users: (search: string, page = 1, limit = 20) =>
    request<UserPage>('GET', `/users${qs({ search: search || undefined, page, limit })}`),
  updateMe: (input: Partial<Omit<User, 'id' | 'email' | 'avatarUrl' | 'createdAt'>>) => request<User>('PATCH', '/users/me', input),
  user: (username: string) => request<User>('GET', `/users/${encodeURIComponent(username)}`),
  follow: (username: string) => request<{ following: true; friend: boolean }>('PUT', `/users/${encodeURIComponent(username)}/follow`),
  unfollow: (username: string) => request<{ following: false; friend?: false }>('DELETE', `/users/${encodeURIComponent(username)}/follow`),

  // Publications
  posts: (cursor?: string | null) => request<Page<Post>>('GET', `/posts${qs({ cursor, limit: 20 })}`),
  feed: (kind: 'for-you' | 'following', cursor?: string | null) =>
    request<Page<Post>>('GET', `/posts/feed/${kind}${qs({ cursor, limit: 20 })}`),
  userPosts: (username: string, cursor?: string | null) =>
    request<Page<Post>>('GET', `/posts/users/${encodeURIComponent(username)}${qs({ cursor, limit: 20 })}`),
  drafts: () => request<Page<Post>>('GET', '/posts/drafts/me?limit=50'),
  post: (id: string) => request<Post>('GET', `/posts/${id}`),
  createPost: (input: { type: PostType; content: string; codeSnippet?: string; tags?: string[]; attachmentIds?: string[] }, draft = false) =>
    request<Post>('POST', draft ? '/posts/drafts' : '/posts', input),
  publishDraft: (id: string) => request<Post>('POST', `/posts/${id}/publish`),
  deletePost: (id: string) => request<{ deleted: true }>('DELETE', `/posts/${id}`),
  like: (id: string, on: boolean) => request<{ liked: boolean }>(on ? 'PUT' : 'DELETE', `/posts/${id}/like`),
  pin: (id: string, on: boolean) => request<{ pinned: boolean }>(on ? 'PUT' : 'DELETE', `/posts/${id}/pin`),
  followQuestion: (id: string, on: boolean) => request<{ following: boolean }>(on ? 'PUT' : 'DELETE', `/posts/${id}/follow`),
  comments: (id: string) => request<Comment[]>('GET', `/posts/${id}/comments`),
  answers: (id: string, sort: 'useful' | 'chronological') => request<Comment[]>('GET', `/posts/${id}/answers${qs({ sort })}`),
  comment: (id: string, content: string, asAnswer: boolean, parentCommentId?: string) =>
    request<Comment>('POST', `/posts/${id}/${asAnswer ? 'answers' : 'comments'}`, { content, parentCommentId }),
  useful: (commentId: string, on: boolean) =>
    request<{ useful: boolean }>(on ? 'PUT' : 'DELETE', `/posts/comments/${commentId}/useful`),

  // Projets
  projects: () => request<Project[]>('GET', '/projects'),
  project: (id: string) => request<Project>('GET', `/projects/${id}`),
  createProject: (input: { name: string; description?: string; repositoryUrl?: string; technologies?: string[]; isBeginnerFriendly?: boolean }) =>
    request<Project>('POST', '/projects', input),
  tasks: (projectId: string) => request<Task[]>('GET', `/projects/${projectId}/tasks`),
  createTask: (projectId: string, input: { title: string; description: string; acceptanceCriteria?: string[]; isBeginnerFriendly?: boolean }) =>
    request<Task>('POST', `/projects/${projectId}/tasks`, input),
  contribute: (projectId: string, message: string, taskId?: string) =>
    request<Contribution>('POST', `/projects/${projectId}/contributions`, { message, taskId }),

  repoPreview: (url: string) => request<RepoPreview>('GET', `/github-preview${qs({ url })}`),

  // Médias : signature côté back, envoi direct à Cloudinary, puis confirmation.
  profileSignature: () => request<UploadSignature>('POST', `/media/profile/signature?ts=${Date.now()}`),
  confirmProfile: (publicId: string) => request<{ avatarUrl: string }>('POST', '/media/profile/confirm', { publicId }),
  postSignature: (resourceType: 'image' | 'video') =>
    request<UploadSignature>('POST', `/media/posts/signature?ts=${Date.now()}`, { resourceType }),
  confirmPost: (publicId: string, resourceType: 'image' | 'video') =>
    request<Media>('POST', '/media/posts/confirm', { publicId, resourceType }),
  notifications: () => request<Notification[]>('GET', '/notifications'),
};
