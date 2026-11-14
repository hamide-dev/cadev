import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthSessionService } from './auth-session.service.js';
import { RefreshSessionEntity } from '../infrastructure/refresh-session.entity.js';

describe('AuthSessionService', () => {
  const secret = 'a'.repeat(64);

  async function createService(
    jwtService: JwtService,
    sessions: object,
  ): Promise<AuthSessionService> {
    const module = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: () => secret } },
        {
          provide: getRepositoryToken(RefreshSessionEntity),
          useValue: sessions,
        },
      ],
    }).compile();
    return module.get(AuthSessionService);
  }

  it('rotates refresh tokens and rejects a previously used token', async () => {
    const jwtService = new JwtService({
      secret,
      signOptions: { expiresIn: '1d' },
    });
    let storedSession: Partial<RefreshSessionEntity> | null = null;
    const sessions = {
      delete: vi.fn().mockResolvedValue({ affected: 0 }),
      save: vi.fn(async (session: Partial<RefreshSessionEntity>) => {
        storedSession = session;
        return session;
      }),
      findOneBy: vi.fn(
        async (criteria: Partial<RefreshSessionEntity>) =>
          storedSession?.id === criteria.id &&
          storedSession.tokenHash === criteria.tokenHash
            ? storedSession
            : null,
      ),
      update: vi.fn(
        async (
          criteria: Partial<RefreshSessionEntity>,
          values: Partial<RefreshSessionEntity>,
        ) => {
          if (
            storedSession?.id !== criteria.id ||
            storedSession.tokenHash !== criteria.tokenHash
          ) {
            return { affected: 0 };
          }
          storedSession = { ...storedSession, ...values };
          return { affected: 1 };
        },
      ),
    };
    const service = await createService(jwtService, sessions);
    const accessToken = await jwtService.signAsync({
      sub: 'user-id',
      email: 'user@example.test',
    });

    const firstRefreshToken = await service.createRefreshToken(accessToken);
    const rotated = await service.refresh(firstRefreshToken);

    await expect(jwtService.verifyAsync(rotated.accessToken)).resolves.toMatchObject({
      sub: 'user-id',
      email: 'user@example.test',
    });
    await expect(service.refresh(firstRefreshToken)).rejects.toThrow();
    await expect(service.refresh(rotated.refreshToken)).resolves.toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(sessions.save).toHaveBeenCalledOnce();
    expect(sessions.update).toHaveBeenCalledTimes(2);
  });

  it('does not renew an unknown refresh session', async () => {
    const jwtService = new JwtService({ secret });
    const sessions = {
      findOneBy: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    };
    const service = await createService(jwtService, sessions);
    const refreshSecret = createHmac('sha256', secret)
      .update('cadev:refresh-token:v1')
      .digest('hex');
    const token = await jwtService.signAsync(
      {
        sub: 'user-id',
        email: 'user@example.test',
        jti: 'c1eb5e95-683d-49d5-840e-b0a11f12201f',
        nonce: 'refresh-token-nonce',
        tokenType: 'refresh',
      },
      { secret: refreshSecret, expiresIn: '2d' },
    );

    await expect(service.refresh(token)).rejects.toThrow();
    expect(sessions.update).not.toHaveBeenCalled();
  });
});
