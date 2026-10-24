// Client HTTP de l'API Hello World. Types calqués sur les DTO publics du back
// (src/modules/*/domain/*.types.ts) : ne rien ajouter que le back ne renvoie pas.

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1`;
const TOKEN_KEY = 'hw.token';

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

export type Author = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;

export interface Media {
  id: string;
  resourceType: 'image' | 'video';
  format: string;
  bytes: number;
  url: string;
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
  accessToken: string;
  tokenType: 'Bearer';
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

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Messages lisibles par un humain, par code métier ou statut HTTP.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  INVALID_VERIFICATION_CODE: 'Ce code ne correspond pas ou a expiré. Vérifie-le ou demande-en un nouveau.',
  VERIFICATION_ATTEMPTS_EXCEEDED: 'Trop de tentatives. Demande un nouveau code.',
  EMAIL_ALREADY_VERIFIED: 'Cette adresse est déjà vérifiée, tu peux te connecter.',
  EMAIL_VERIFICATION_REQUIRED: "Ton adresse n'est pas encore vérifiée. Termine l'inscription avec le code reçu.",
  EMAIL_PROVIDER_NOT_CONFIGURED: "L'envoi d'e-mails n'est pas encore configuré sur ce serveur. Connecte-toi avec ton mot de passe.",
  ACCOUNT_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail ou ce pseudo.',
  CANNOT_FOLLOW_SELF: 'Tu ne peux pas te suivre toi-même.',
  USER_NOT_FOUND: "Ce développeur n'existe pas.",
  OAUTH_PROVIDER_NOT_CONFIGURED: "Cette connexion n'est pas encore configurée sur ce serveur.",
  MEDIA_PROVIDER_NOT_CONFIGURED: "L'envoi d'images n'est pas encore configuré sur ce serveur.",
  MEDIA_FORMAT_NOT_ALLOWED: "Ce format de fichier n'est pas accepté.",
  MEDIA_TOO_LARGE: 'Ce fichier est trop lourd.',
  POST_ATTACHMENT_LIMIT: 'Cinq pièces jointes maximum par publication.',
  POST_CONTENT_REQUIRED: 'Écris quelque chose avant de publier.',
  INVALID_GITHUB_REPOSITORY_URL: 'Ce lien ne ressemble pas à un dépôt GitHub (github.com/owner/repo).',
  GITHUB_API_UNAVAILABLE: "GitHub ne répond pas pour l'instant.",
  PROJECT_ACCESS_DENIED: 'Seuls les responsables du projet peuvent faire ça.',
  PASSWORD_TOO_LONG: 'Ce mot de passe est trop long (72 octets maximum).',
};
const BY_STATUS: Record<number, string> = {
  400: 'Certains champs ne sont pas valides. Vérifie-les et réessaie.',
  401: 'Ta session a expiré. Reconnecte-toi.',
  403: "Tu n'as pas le droit de faire cette action.",
  404: "Ce contenu n'existe pas ou a été supprimé.",
  409: 'Cette valeur est déjà utilisée.',
  429: 'Trop de tentatives en peu de temps. Patiente une minute.',
  503: "Ce service n'est pas disponible sur le serveur pour le moment.",
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : la session reste en mémoire le temps de l'onglet.
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code: string = data?.code ?? data?.error ?? 'HTTP_ERROR';
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(
      response.status,
      code,
      MESSAGES[code] ?? BY_STATUS[response.status] ?? 'Une erreur est survenue. Réessaie dans un instant.',
    );
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value != null) search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const api = {
  // Auth
  register: (input: { email: string; username: string; displayName: string; password: string }) =>
    request<{ message: string; email: string; expiresIn: number }>('POST', '/auth/register', input),
  verifyEmail: (email: string, code: string) => request<AuthResponse>('POST', '/auth/email/verify', { email, code }),
  resendVerification: (email: string) => request<{ message: string }>('POST', '/auth/email/resend', { email }),
  login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
  requestLoginCode: (email: string) => request<{ message: string }>('POST', '/auth/login/code', { email }),
  verifyLoginCode: (email: string, code: string) => request<AuthResponse>('POST', '/auth/login/verify', { email, code }),
  oauthUrl: (provider: 'google' | 'github') => `${BASE}/auth/${provider}`,

  // Utilisateurs
  me: () => request<User>('GET', '/users/me'),
  updateMe: (input: Partial<Omit<User, 'id' | 'email' | 'avatarUrl' | 'createdAt'>>) => request<User>('PATCH', '/users/me', input),
  user: (username: string) => request<User>('GET', `/users/${encodeURIComponent(username)}`),
  follow: (username: string) => request<{ following: true }>('PUT', `/users/${encodeURIComponent(username)}/follow`),
  unfollow: (username: string) => request<{ following: false }>('DELETE', `/users/${encodeURIComponent(username)}/follow`),

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
  profileSignature: () => request<UploadSignature>('POST', '/media/profile/signature'),
  confirmProfile: (publicId: string) => request<{ avatarUrl: string }>('POST', '/media/profile/confirm', { publicId }),
  postSignature: (resourceType: 'image' | 'video') => request<UploadSignature>('POST', '/media/posts/signature', { resourceType }),
  confirmPost: (publicId: string, resourceType: 'image' | 'video') =>
    request<Media>('POST', '/media/posts/confirm', { publicId, resourceType }),
};

// Doit reprendre exactement les formats signés par le back (media.service.ts),
// sinon Cloudinary refuse la signature. Le back ne les renvoie pas encore.
const FORMATS = { profile: 'jpg,jpeg,png,webp', image: 'jpg,jpeg,png,webp,gif', video: 'mp4,webm,mov' };

export async function uploadToCloudinary(sig: UploadSignature, file: File, formats: keyof typeof FORMATS): Promise<void> {
  if (file.size > sig.maxBytes) {
    throw new ApiError(413, 'TOO_LARGE', `Ce fichier dépasse ${Math.round(sig.maxBytes / 1024 / 1024)} Mo.`);
  }
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', sig.apiKey);
  form.set('timestamp', String(sig.timestamp));
  form.set('signature', sig.signature);
  form.set('public_id', sig.publicId);
  form.set('type', sig.uploadType);
  form.set('overwrite', 'false');
  form.set('allowed_formats', FORMATS[formats]);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, {
    method: 'POST',
    body: form,
  }).catch(() => null);
  if (!response?.ok) throw new ApiError(502, 'UPLOAD_FAILED', "L'envoi du fichier a échoué. Réessaie.");
}
