import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { Environment } from '../../../config/environment.js';
import { UsersService } from '../../users/application/users.service.js';
import { EmailVerificationEntity } from '../infrastructure/email-verification.entity.js';
import { BrevoEmailService } from '../infrastructure/brevo-email.service.js';
import type { PublicUser } from '../../users/domain/user.types.js';
import type { RegisterDto } from '../presentation/dto/register.dto.js';
import type { LoginDto } from '../presentation/dto/login.dto.js';
import type { RequestLoginCodeDto } from '../presentation/dto/request-login-code.dto.js';
import type { VerifyEmailDto } from '../presentation/dto/verify-email.dto.js';
import type { VerifyLoginCodeDto } from '../presentation/dto/verify-login-code.dto.js';
import type { OAuthIdentity } from '../domain/oauth-identity.js';
import type { EmailVerificationPurpose } from '../infrastructure/email-verification.entity.js';
import { PendingRegistrationEntity } from '../infrastructure/pending-registration.entity.js';

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: PublicUser;
}

export interface RegistrationResponse {
  message: string;
  email: string;
  expiresIn: number;
}

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

function assertBcryptPasswordLength(password: string): void {
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException({
      code: 'PASSWORD_TOO_LONG',
      message: 'Password must not exceed 72 UTF-8 bytes.',
    });
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly brevoEmail: BrevoEmailService,
    private readonly config: ConfigService<Environment, true>,
    @InjectRepository(EmailVerificationEntity)
    private readonly emailVerifications: Repository<EmailVerificationEntity>,
    @InjectRepository(PendingRegistrationEntity)
    private readonly pendingRegistrations: Repository<PendingRegistrationEntity>,
  ) {}

  async register(input: RegisterDto): Promise<RegistrationResponse> {
    assertBcryptPasswordLength(input.password);
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    await this.pendingRegistrations.delete({ expiresAt: LessThan(new Date()) });
    if (await this.usersService.findByEmail(email)) {
      throw registrationConflict('An account with this email already exists.');
    }
    if (await this.usersService.findByUsername(username)) {
      throw registrationConflict('This username is already in use.');
    }

    const pendingWithUsername = await this.pendingRegistrations.findOneBy({
      username,
    });
    const pending = await this.pendingRegistrations.findOneBy({ email });
    if (pendingWithUsername && pendingWithUsername.email !== email) {
      throw registrationConflict('This username is already in use.');
    }
    const registration =
      pending ??
      this.pendingRegistrations.create({
        id: randomUUID(),
        email,
        username,
        displayName: input.displayName.trim(),
        passwordHash: '',
        codeHash: '',
        attempts: 0,
        expiresAt: new Date(),
      });
    registration.username = username;
    registration.displayName = input.displayName.trim();
    registration.passwordHash = await bcrypt.hash(input.password, 12);
    await this.sendPendingRegistrationCode(registration);
    return {
      message: 'A verification code has been sent to your email address.',
      email,
      expiresIn: VERIFICATION_TTL_MS / 1000,
    };
  }

  async verifyEmail(input: VerifyEmailDto): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const pending = await this.pendingRegistrations.findOneBy({ email });
    if (pending) return this.verifyPendingRegistration(pending, input.code);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw invalidVerificationCode();
    }
    if (user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'This email address has already been verified.',
      });
    }

    const verification = await this.emailVerifications.findOneBy({
      userId: user.id,
      purpose: 'registration',
    });
    if (!verification) throw invalidVerificationCode();
    if (verification.expiresAt.getTime() <= Date.now()) {
      await this.emailVerifications.delete({ id: verification.id });
      throw invalidVerificationCode();
    }

    const attempts = await this.emailVerifications.increment(
      { id: verification.id, attempts: LessThan(MAX_VERIFICATION_ATTEMPTS) },
      'attempts',
      1,
    );
    if (!attempts.affected) {
      throw new ForbiddenException({
        code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
        message: 'Request a new verification code and try again.',
      });
    }

    const expectedHash = this.hashVerificationCode(
      user.id,
      input.code,
      'registration',
    );
    const storedHash = Buffer.from(verification.codeHash, 'hex');
    const submittedHash = Buffer.from(expectedHash, 'hex');
    if (
      storedHash.length !== submittedHash.length ||
      !timingSafeEqual(storedHash, submittedHash)
    ) {
      throw invalidVerificationCode();
    }

    const verifiedUser = await this.usersService.markEmailVerified(user.id);
    await this.emailVerifications.delete({ id: verification.id });
    return this.issueToken(
      verifiedUser.id,
      verifiedUser.email,
      this.usersService.toPublic(verifiedUser),
    );
  }

  async resendVerificationCode(email: string): Promise<RegistrationResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await this.pendingRegistrations.findOneBy({
      email: normalizedEmail,
    });
    if (pending) await this.sendPendingRegistrationCode(pending);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!pending && user && !user.emailVerified) {
      await this.sendVerificationCode(user.id, user.email);
    }
    return {
      message:
        'If this address has a pending account, a verification code has been sent.',
      email: normalizedEmail,
      expiresIn: VERIFICATION_TTL_MS / 1000,
    };
  }

  async requestLoginCode(
    input: RequestLoginCodeDto,
  ): Promise<RegistrationResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (user?.emailVerified) {
      await this.sendVerificationCode(user.id, user.email, 'login');
    }
    return {
      message: 'If this verified account exists, a login code has been sent.',
      email: normalizedEmail,
      expiresIn: VERIFICATION_TTL_MS / 1000,
    };
  }

  async verifyLoginCode(input: VerifyLoginCodeDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(
      input.email.trim().toLowerCase(),
    );
    if (!user?.emailVerified) throw invalidVerificationCode();
    const verification = await this.emailVerifications.findOneBy({
      userId: user.id,
      purpose: 'login',
    });
    if (!verification) throw invalidVerificationCode();
    if (verification.expiresAt.getTime() <= Date.now()) {
      await this.emailVerifications.delete({ id: verification.id });
      throw invalidVerificationCode();
    }
    const attempts = await this.emailVerifications.increment(
      { id: verification.id, attempts: LessThan(MAX_VERIFICATION_ATTEMPTS) },
      'attempts',
      1,
    );
    if (!attempts.affected) {
      throw new ForbiddenException({
        code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
        message: 'Request a new login code and try again.',
      });
    }
    const expectedHash = this.hashVerificationCode(user.id, input.code, 'login');
    const storedHash = Buffer.from(verification.codeHash, 'hex');
    const submittedHash = Buffer.from(expectedHash, 'hex');
    if (
      storedHash.length !== submittedHash.length ||
      !timingSafeEqual(storedHash, submittedHash)
    ) {
      throw invalidVerificationCode();
    }
    await this.emailVerifications.delete({ id: verification.id });
    return this.issueToken(
      user.id,
      user.email,
      this.usersService.toPublic(user),
    );
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    assertBcryptPasswordLength(input.password);
    const user = await this.usersService.findByEmailForAuthentication(
      input.email.trim().toLowerCase(),
    );
    const validPassword = user?.passwordHash
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.hash(input.password, 12).then(() => false);
    if (!user || !validPassword) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Verify your email address before signing in.',
      });
    }

    return this.issueToken(
      user.id,
      user.email,
      this.usersService.toPublic(user),
    );
  }

  async loginWithOAuth(identity: OAuthIdentity): Promise<AuthResponse> {
    const existing = await this.usersService.findByOAuthIdentity(
      identity.provider,
      identity.providerId,
    );
    const user =
      existing ??
      (await this.usersService.createOrLinkOAuthUser({
        ...identity,
        email: identity.email.trim().toLowerCase(),
      }));
    return this.issueToken(
      user.id,
      user.email,
      this.usersService.toPublic(user),
    );
  }

  private async sendVerificationCode(
    userId: string,
    email: string,
    purpose: EmailVerificationPurpose = 'registration',
  ): Promise<void> {
    const code = randomInt(0, 10_000).toString().padStart(4, '0');
    await this.emailVerifications.upsert(
      {
        userId,
        codeHash: this.hashVerificationCode(userId, code, purpose),
        purpose,
        attempts: 0,
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
      ['userId'],
    );
    await this.brevoEmail.sendVerificationCode(email, code, purpose);
  }

  private async sendPendingRegistrationCode(
    pending: PendingRegistrationEntity,
  ): Promise<void> {
    const code = randomInt(0, 10_000).toString().padStart(4, '0');
    pending.codeHash = this.hashVerificationCode(
      pending.id,
      code,
      'registration',
    );
    pending.attempts = 0;
    pending.expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await this.pendingRegistrations.save(pending);
    await this.brevoEmail.sendVerificationCode(
      pending.email,
      code,
      'registration',
    );
  }

  private async verifyPendingRegistration(
    pending: PendingRegistrationEntity,
    code: string,
  ): Promise<AuthResponse> {
    if (pending.expiresAt.getTime() <= Date.now()) {
      await this.pendingRegistrations.delete({ id: pending.id });
      throw invalidVerificationCode();
    }
    const attempts = await this.pendingRegistrations.increment(
      { id: pending.id, attempts: LessThan(MAX_VERIFICATION_ATTEMPTS) },
      'attempts',
      1,
    );
    if (!attempts.affected) {
      throw new ForbiddenException({
        code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
        message: 'Request a new verification code and try again.',
      });
    }
    const expectedHash = this.hashVerificationCode(
      pending.id,
      code,
      'registration',
    );
    const storedHash = Buffer.from(pending.codeHash, 'hex');
    const submittedHash = Buffer.from(expectedHash, 'hex');
    if (
      storedHash.length !== submittedHash.length ||
      !timingSafeEqual(storedHash, submittedHash)
    ) {
      throw invalidVerificationCode();
    }

    const user = await this.usersService.create({
      email: pending.email,
      username: pending.username,
      displayName: pending.displayName,
      passwordHash: pending.passwordHash,
      emailVerified: true,
    });
    await this.pendingRegistrations.delete({ id: pending.id });
    return this.issueToken(
      user.id,
      user.email,
      this.usersService.toPublic(user),
    );
  }

  private hashVerificationCode(
    userId: string,
    code: string,
    purpose: EmailVerificationPurpose,
  ): string {
    return createHmac(
      'sha256',
      this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    )
      .update(`${purpose}:${userId}:${code}`)
      .digest('hex');
  }

  private async issueToken(
    id: string,
    email: string,
    user: PublicUser,
  ): Promise<AuthResponse> {
    return {
      accessToken: await this.jwtService.signAsync({ sub: id, email }),
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    };
  }
}

function invalidVerificationCode(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_VERIFICATION_CODE',
    message: 'The verification code is invalid or expired.',
  });
}

function registrationConflict(message: string): ConflictException {
  return new ConflictException({
    code: 'REGISTRATION_CONFLICT',
    message,
  });
}
