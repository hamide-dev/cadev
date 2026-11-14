export interface AuthUser {
  id: string;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  tokenType?: 'socket' | 'refresh';
}
