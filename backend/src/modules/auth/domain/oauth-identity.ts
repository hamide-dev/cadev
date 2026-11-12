export interface OAuthIdentity {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName: string;
}
