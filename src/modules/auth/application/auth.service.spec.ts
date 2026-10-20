import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { UsersService } from '../../users/application/users.service.js';
import { UserEntity } from '../../users/infrastructure/user.entity.js';
import { BrevoSmtpService } from '../infrastructure/brevo-smtp.service.js';
import { EmailVerificationEntity } from '../infrastructure/email-verification.entity.js';

describe('AuthService', () => {
  const password = 'correct-horse-battery-staple';
  const publicUser = {
    id: '9dd1e06a-983c-4d68-b507-c611ca65e567',
    username: 'dev_user',
    displayName: 'Developer',
    bio: null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
  const user = new UserEntity();
  user.id = publicUser.id;
  user.email = 'dev@example.test';
  user.username = publicUser.username;
  user.displayName = publicUser.displayName;
  user.passwordHash = '$2b$12$test-hash';
  user.emailVerified = false;
  user.bio = null;
  user.avatarUrl = null;
  user.createdAt = new Date();
  user.updatedAt = new Date();

  it('registers and returns an explicit public projection, never the hash', async () => {
    const passwordHash = await bcrypt.hash(password, 4);
    const usersService = {
      create: vi
        .fn()
        .mockResolvedValue(
          Object.assign(new UserEntity(), user, { passwordHash }),
        ),
      toPublic: vi.fn().mockReturnValue(publicUser),
    };
    const jwtService = {
      signAsync: vi.fn().mockResolvedValue('access-token'),
    };
    const emailVerifications = {
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    const brevoSmtp = {
      sendVerificationCode: vi.fn().mockResolvedValue(undefined),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: BrevoSmtpService, useValue: brevoSmtp },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('test-secret') },
        },
        {
          provide: getRepositoryToken(EmailVerificationEntity),
          useValue: emailVerifications,
        },
      ],
    }).compile();

    const service = testingModule.get(AuthService);
    const response = await service.register({
      email: ' DEV@example.test ',
      username: 'Dev_User',
      displayName: 'Developer',
      password,
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'dev@example.test',
        username: 'dev_user',
        passwordHash: expect.any(String),
        emailVerified: false,
      }),
    );
    expect(
      await bcrypt.compare(
        password,
        usersService.create.mock.calls[0]![0].passwordHash,
      ),
    ).toBe(true);
    expect(response).toMatchObject({
      message: 'A verification code has been sent to your email address.',
      email: 'dev@example.test',
      expiresIn: 600,
    });
    expect(brevoSmtp.sendVerificationCode).toHaveBeenCalledWith(
      'dev@example.test',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(emailVerifications.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        codeHash: expect.any(String),
        attempts: 0,
        expiresAt: expect.any(Date),
      }),
      ['userId'],
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns the same authentication error for an unknown account', async () => {
    const usersService = {
      findByEmailForAuthentication: vi.fn().mockResolvedValue(null),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { signAsync: vi.fn() } },
        {
          provide: BrevoSmtpService,
          useValue: { sendVerificationCode: vi.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('test-secret') },
        },
        {
          provide: getRepositoryToken(EmailVerificationEntity),
          useValue: {},
        },
      ],
    }).compile();

    await expect(
      testingModule.get(AuthService).login({
        email: 'missing@example.test',
        password,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_CREDENTIALS',
      },
    });
  });

  it('verifies the emailed code before issuing an access token', async () => {
    const code = '083147';
    const codeHash = createHmac('sha256', 'test-secret')
      .update(`${user.id}:${code}`)
      .digest('hex');
    const verifiedUser = Object.assign(new UserEntity(), user, {
      emailVerified: true,
    });
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(user),
      markEmailVerified: vi.fn().mockResolvedValue(verifiedUser),
      toPublic: vi.fn().mockReturnValue(publicUser),
    };
    const emailVerifications = {
      findOneBy: vi.fn().mockResolvedValue({
        id: 'verification-id',
        userId: user.id,
        codeHash,
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      increment: vi.fn().mockResolvedValue({ affected: 1 }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const jwtService = {
      signAsync: vi.fn().mockResolvedValue('access-token'),
    };
    const testingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: BrevoSmtpService,
          useValue: { sendVerificationCode: vi.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('test-secret') },
        },
        {
          provide: getRepositoryToken(EmailVerificationEntity),
          useValue: emailVerifications,
        },
      ],
    }).compile();

    await expect(
      testingModule.get(AuthService).verifyEmail({
        email: user.email,
        code,
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: publicUser,
    });
    expect(usersService.markEmailVerified).toHaveBeenCalledWith(user.id);
    expect(emailVerifications.delete).toHaveBeenCalledWith({
      id: 'verification-id',
    });
  });
});
