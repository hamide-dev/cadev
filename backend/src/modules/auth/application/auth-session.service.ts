import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import type { Environment } from '../../../config/environment.js';
import type { AccessTokenPayload } from '../../../common/auth/auth-user.js';
import { RefreshSessionEntity } from '../infrastructure/refresh-session.entity.js';

const REFRESH_TOKEN_TTL_MS = 2 * 24 * 60 * 60 * 1000;

interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
  nonce: string;
  tokenType: 'refresh';
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Environment, true>,
    @InjectRepository(RefreshSessionEntity)
    private readonly sessions: Repository<RefreshSessionEntity>,
  ) {}

  async createRefreshToken(accessToken: string): Promise<string> {
    const accessPayload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
    if (!accessPayload.sub || !accessPayload.email) {
      throw new UnauthorizedException();
    }

    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const sessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(
      accessPayload.sub,
      accessPayload.email,
      sessionId,
    );
    await this.sessions.save({
      id: sessionId,
      userId: accessPayload.sub,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return refreshToken;
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.refreshSecret() },
      );
    } catch {
      throw new UnauthorizedException();
    }
    if (
      payload.tokenType !== 'refresh' ||
      !payload.jti ||
      !payload.nonce ||
      !payload.sub ||
      !payload.email
    ) {
      throw new UnauthorizedException();
    }

    const priorHash = this.hashToken(refreshToken);
    const session = await this.sessions.findOneBy({
      id: payload.jti,
      userId: payload.sub,
      tokenHash: priorHash,
      expiresAt: MoreThan(new Date()),
    });
    if (!session) throw new UnauthorizedException();

    const accessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
    });
    const nextRefreshToken = await this.signRefreshToken(
      payload.sub,
      payload.email,
      session.id,
    );
    const result = await this.sessions.update(
      {
        id: session.id,
        tokenHash: priorHash,
        expiresAt: MoreThan(new Date()),
      },
      {
        tokenHash: this.hashToken(nextRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    );
    if (result.affected !== 1) throw new UnauthorizedException();

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.refreshSecret(), ignoreExpiration: true },
      );
    } catch {
      return;
    }
    if (payload.tokenType === 'refresh' && payload.jti) {
      await this.sessions.delete({ id: payload.jti });
    }
  }

  private signRefreshToken(
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        jti: sessionId,
        nonce: randomUUID(),
        tokenType: 'refresh',
      },
      { secret: this.refreshSecret(), expiresIn: '2d' },
    );
  }

  private refreshSecret(): string {
    return createHmac(
      'sha256',
      this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    )
      .update('cadev:refresh-token:v1')
      .digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
