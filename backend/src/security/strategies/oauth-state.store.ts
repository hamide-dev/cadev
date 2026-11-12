import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

type StoreCallback = (error: Error | null, state?: string) => void;
type VerifyCallback = (
  error: Error | null,
  verified: boolean,
  state?: unknown,
) => void;
interface StoreMetadata {
  authorizationURL: string;
  tokenURL: string;
  clientID: string;
}

export class OAuthStateStore {
  constructor(
    private readonly provider: 'google' | 'github',
    private readonly secret: string,
    private readonly callbackUrl: string,
  ) {}

  store(request: Request, callback: StoreCallback): void;
  store(
    request: Request,
    metadata: StoreMetadata,
    callback: StoreCallback,
  ): void;
  store(
    request: Request,
    callbackOrMetadata: StoreCallback | StoreMetadata,
    metadataCallback?: StoreCallback,
  ): void {
    const callback =
      typeof callbackOrMetadata === 'function'
        ? callbackOrMetadata
        : metadataCallback;
    if (!callback) throw new Error('OAuth state callback is unavailable.');
    const state = randomBytes(32).toString('base64url');
    try {
      this.setStateCookie(request, `${state}.${this.sign(state)}`, false);
      callback(null, state);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  verify(request: Request, state: string, callback: VerifyCallback): void;
  verify(
    request: Request,
    state: string,
    metadata: StoreMetadata,
    callback: VerifyCallback,
  ): void;
  verify(
    request: Request,
    state: string,
    callbackOrMetadata: VerifyCallback | StoreMetadata,
    metadataCallback?: VerifyCallback,
  ): void {
    const callback =
      typeof callbackOrMetadata === 'function'
        ? callbackOrMetadata
        : metadataCallback;
    if (!callback) throw new Error('OAuth state callback is unavailable.');
    try {
      const cookie = this.readStateCookie(request);
      this.setStateCookie(request, '', true);
      if (!cookie || typeof state !== 'string') {
        callback(null, false);
        return;
      }
      const [cookieState, signature, extra] = cookie.split('.');
      if (!cookieState || !signature || extra !== undefined) {
        callback(null, false);
        return;
      }
      const expectedSignature = this.sign(cookieState);
      const supplied = Buffer.from(signature);
      const expected = Buffer.from(expectedSignature);
      callback(
        null,
        cookieState === state &&
          supplied.length === expected.length &&
          timingSafeEqual(supplied, expected),
      );
    } catch (error) {
      callback(
        error instanceof Error ? error : new Error(String(error)),
        false,
      );
    }
  }

  private sign(state: string): string {
    return createHmac('sha256', this.secret)
      .update(`${this.provider}:${state}`)
      .digest('hex');
  }

  private readStateCookie(request: Request): string | undefined {
    const cookieName = this.cookieName();
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;
    for (const entry of cookieHeader.split(';')) {
      const separator = entry.indexOf('=');
      if (separator < 0 || entry.slice(0, separator).trim() !== cookieName) {
        continue;
      }
      return entry.slice(separator + 1).trim();
    }
    return undefined;
  }

  private setStateCookie(
    request: Request,
    value: string,
    clear: boolean,
  ): void {
    if (!request.res) throw new Error('OAuth response is unavailable.');
    const prior = request.res.getHeader('Set-Cookie');
    const headers = Array.isArray(prior)
      ? prior.map(String)
      : prior
        ? [String(prior)]
        : [];
    const callback = new URL(this.callbackUrl);
    const secure = callback.protocol === 'https:' ? '; Secure' : '';
    const maxAge = clear ? 0 : 600;
    headers.push(
      `${this.cookieName()}=${value}; Path=${callback.pathname}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`,
    );
    request.res.setHeader('Set-Cookie', headers);
  }

  private cookieName(): string {
    return `hw_oauth_${this.provider}_state`;
  }
}
