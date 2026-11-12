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
import { SmtpEmailService } from '../infrastructure/smtp-email.service.js';
import type { PublicUser } from '../../users/domain/user.types.js';
import type { RegisterDto } from '../presentation/dto/register.dto.js';
import type { InitRegistrationDto } from '../presentation/dto/init-registration.dto.js';
import type { CompleteRegistrationDto } from '../presentation/dto/complete-registration.dto.js';
import type { LoginDto } from '../presentation/dto/login.dto.js';
import type { RequestLoginCodeDto } from '../presentation/dto/request-login-code.dto.js';
import type { VerifyEmailDto } from '../presentation/dto/verify-email.dto.js';
import type { VerifyLoginCodeDto } from '../presentation/dto/verify-login-code.dto.js';
import type { RequestPasswordResetDto } from '../presentation/dto/request-password-reset.dto.js';
import type { ResetPasswordDto } from '../presentation/dto/reset-password.dto.js';
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

/** Réponse renvoyée après validation OTP de l'étape 1 (email vérifié, compte pas encore créé). */
export interface EmailVerifiedResponse {
  emailVerified: true;
  email: string;
}

const VERIFICATION_TTL_MS = 4 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes

interface LoginAttemptTracker {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

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
    private readonly smtpEmail: SmtpEmailService,
    private readonly config: ConfigService<Environment, true>,
    @InjectRepository(EmailVerificationEntity)
    private readonly emailVerifications: Repository<EmailVerificationEntity>,
    @InjectRepository(PendingRegistrationEntity)
    private readonly pendingRegistrations: Repository<PendingRegistrationEntity>,
  ) {}

  private readonly loginAttempts = new Map<string, LoginAttemptTracker>();

  // ---------------------------------------------------------------------------
  // Nouveau flux en deux phases
  // ---------------------------------------------------------------------------

  /**
   * Étape 1 : reçoit nom + e-mail, vérifie que l'adresse n'est pas déjà prise,
   * crée une pré-inscription et envoie un code OTP par e-mail.
   */
  async initRegistration(input: InitRegistrationDto): Promise<RegistrationResponse> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();

    await this.pendingRegistrations.delete({ expiresAt: LessThan(new Date()) });

    if (await this.usersService.findByEmail(email)) {
      throw emailAlreadyExists();
    }

    let pending = await this.pendingRegistrations.findOneBy({ email });
    if (!pending) {
      pending = this.pendingRegistrations.create({
        id: randomUUID(),
        email,
        username: null,
        displayName,
        passwordHash: null,
        codeHash: null,
        emailVerified: false,
        attempts: 0,
        expiresAt: new Date(),
      });
    } else {
      // Réinitialise la pré-inscription si l'utilisateur recommence depuis le début.
      pending.emailVerified = false;
      pending.username = null;
      pending.passwordHash = null;
    }
    pending.displayName = displayName;
    await this.sendPendingRegistrationCode(pending);
    return {
      message: 'A verification code has been sent to your email address.',
      email,
      expiresIn: VERIFICATION_TTL_MS / 1000,
    };
  }

  /**
   * Étape 1 (suite) : valide l'OTP envoyé lors de initRegistration.
   * Marque l'e-mail comme vérifié dans la pré-inscription mais NE crée PAS encore le compte.
   * L'utilisateur doit ensuite choisir son pseudo et son mot de passe.
   */
  async verifyInitOtp(email: string, code: string): Promise<EmailVerifiedResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await this.pendingRegistrations.findOneBy({ email: normalizedEmail });
    if (!pending || pending.emailVerified) {
      // Si déjà vérifié ou introuvable, on délègue au flux legacy
      throw invalidVerificationCode();
    }
    await this.checkAndConsumeOtpOnPending(pending, code, false);
    // Marque la pré-inscription comme e-mail vérifié
    pending.emailVerified = true;
    pending.codeHash = null;
    // Renouvelle l'expiration pour laisser le temps à l'utilisateur de choisir son pseudo
    pending.expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await this.pendingRegistrations.save(pending);
    return { emailVerified: true, email: normalizedEmail };
  }

  /**
   * Vérifie si un nom d'utilisateur est disponible (ni en base, ni en pré-inscription).
   */
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(normalized)) {
      return { available: false };
    }
    const inUse =
      (await this.usersService.findByUsername(normalized)) !== null ||
      (await this.pendingRegistrations.findOneBy({ username: normalized })) !== null;
    return { available: !inUse };
  }

  /**
   * Étape 2 : reçoit l'e-mail (vérifié), le pseudo et le mot de passe.
   * Vérifie la disponibilité du pseudo, puis crée le compte définitif.
   */
  async completeRegistration(input: CompleteRegistrationDto): Promise<AuthResponse> {
    assertBcryptPasswordLength(input.password);
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    const pending = await this.pendingRegistrations.findOneBy({ email });
    if (!pending || !pending.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Verify your email address before completing registration.',
      });
    }
    if (pending.expiresAt.getTime() <= Date.now()) {
      await this.pendingRegistrations.delete({ id: pending.id });
      throw new ForbiddenException({
        code: 'REGISTRATION_EXPIRED',
        message: 'Your registration session has expired. Please start over.',
      });
    }

    // Vérifie la disponibilité du pseudo
    if (await this.usersService.findByUsername(username)) {
      throw usernameAlreadyExists();
    }
    const pendingWithUsername = await this.pendingRegistrations.findOneBy({ username });
    if (pendingWithUsername && pendingWithUsername.email !== email) {
      throw usernameAlreadyExists();
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.usersService.create({
      email: pending.email,
      username,
      displayName: pending.displayName,
      passwordHash,
      emailVerified: true,
    });
    await this.pendingRegistrations.delete({ id: pending.id });
    return this.issueToken(user.id, user.email, this.usersService.toPublic(user));
  }

  // ---------------------------------------------------------------------------
  // Ancien flux (conservé pour compatibilité et OAuth)
  // ---------------------------------------------------------------------------

  async register(input: RegisterDto): Promise<RegistrationResponse> {
    assertBcryptPasswordLength(input.password);
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    await this.pendingRegistrations.delete({ expiresAt: LessThan(new Date()) });
    if (await this.usersService.findByEmail(email)) {
      throw emailAlreadyExists();
    }
    if (await this.usersService.findByUsername(username)) {
      throw usernameAlreadyExists();
    }

    const pendingWithUsername = await this.pendingRegistrations.findOneBy({
      username,
    });
    const pending = await this.pendingRegistrations.findOneBy({ email });
    if (pendingWithUsername && pendingWithUsername.email !== email) {
      throw usernameAlreadyExists();
    }
    const registration =
      pending ??
      this.pendingRegistrations.create({
        id: randomUUID(),
        email,
        username,
        displayName: input.displayName.trim(),
        passwordHash: null,
        codeHash: null,
        emailVerified: false,
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

  async verifyEmail(input: VerifyEmailDto): Promise<AuthResponse | EmailVerifiedResponse> {
    const email = input.email.trim().toLowerCase();
    const pending = await this.pendingRegistrations.findOneBy({ email });
    if (pending) {
      // Nouveau flux : OTP de pré-inscription (étape 1, e-mail pas encore vérifié)
      if (!pending.emailVerified) {
        return this.verifyInitOtp(email, input.code);
      }
      // Ancien flux : pré-inscription complète (username + password déjà renseignés)
      if (pending.username && pending.passwordHash) {
        return this.verifyPendingRegistration(pending, input.code);
      }
      throw invalidVerificationCode();
    }

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
    if (pending && !pending.emailVerified) {
      await this.sendPendingRegistrationCode(pending);
    }
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
    const email = input.email.trim().toLowerCase();
    const now = Date.now();

    // Nettoyage périodique si la Map grossit
    if (this.loginAttempts.size > 1000) {
      for (const [key, val] of this.loginAttempts.entries()) {
        if (now - val.lastAttemptAt > 30 * 60 * 1000) {
          this.loginAttempts.delete(key);
        }
      }
    }

    // Vérifie si le compte est actuellement verrouillé pour cet e-mail
    const attempt = this.loginAttempts.get(email);
    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      const durationMsg =
        remainingSeconds > 60
          ? ${remainingMinutes} minute
          : ${remainingSeconds} seconde;
      throw new ForbiddenException({
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: Compte temporairement bloqué suite à 5 tentatives infructueuses. Réessayez dans .,
        remainingSeconds,
      });
    }

    const user = await this.usersService.findByEmailForAuthentication(email);
    const validPassword = user?.passwordHash
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.hash(input.password, 12).then(() => false);

    if (!user || !validPassword) {
      const current = this.loginAttempts.get(email) ?? {
        failedAttempts: 0,
        lockedUntil: null,
        lastAttemptAt: now,
      };

      // Si le verrou précédent a expiré, on repart de 0
      if (current.lockedUntil && current.lockedUntil <= now) {
        current.failedAttempts = 0;
        current.lockedUntil = null;
      }

      current.failedAttempts += 1;
      current.lastAttemptAt = now;

      // 5 tentatives atteintes -> verrouille pendant 2 minutes (120 secondes)
      if (current.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        current.lockedUntil = now + LOGIN_LOCKOUT_MS;
        current.failedAttempts = 0;
        this.loginAttempts.set(email, current);
        throw new ForbiddenException({
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
          message: 'Mot de passe incorrect. Vous avez échoué 5 tentatives : votre compte est bloqué pendant 2 minutes.',
          remainingSeconds: 120,
        });
      }

      this.loginAttempts.set(email, current);
      const remaining = MAX_LOGIN_ATTEMPTS - current.failedAttempts;
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: E-mail ou mot de passe incorrect. Plus que  tentative avant blocage pendant 2 minutes.,
      });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Verify your email address before signing in.',
      });
    }

    // Mot de passe correct : réinitialise le compteur d'échecs
    this.loginAttempts.delete(email);

    return this.issueToken(
      user.id,
      user.email,
      this.usersService.toPublic(user),
    );
  }

  async requestPasswordReset(
    input: RequestPasswordResetDto,
  ): Promise<RegistrationResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (user?.emailVerified) {
      await this.sendVerificationCode(user.id, user.email, 'password-reset');
    }
    return {
      message: 'If this verified account exists, a password reset code has been sent.',
      email,
      expiresIn: VERIFICATION_TTL_MS / 1000,
    };
  }

  async resetPassword(input: ResetPasswordDto): Promise<{ message: string }> {
    assertBcryptPasswordLength(input.password);
    const user = await this.usersService.findByEmail(
      input.email.trim().toLowerCase(),
    );
    if (!user?.emailVerified) throw invalidVerificationCode();
    const verification = await this.emailVerifications.findOneBy({
      userId: user.id,
      purpose: 'password-reset',
    });
    if (!verification || verification.expiresAt.getTime() <= Date.now()) {
      if (verification) await this.emailVerifications.delete({ id: verification.id });
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
        message: 'Request a new password reset code and try again.',
      });
    }
    const expectedHash = this.hashVerificationCode(
      user.id,
      input.code,
      'password-reset',
    );
    const storedHash = Buffer.from(verification.codeHash, 'hex');
    const submittedHash = Buffer.from(expectedHash, 'hex');
    if (
      storedHash.length !== submittedHash.length ||
      !timingSafeEqual(storedHash, submittedHash)
    ) {
      throw invalidVerificationCode();
    }
    await this.usersService.updatePassword(
      user.id,
      await bcrypt.hash(input.password, 12),
    );
    await this.emailVerifications.delete({ id: verification.id });
    return { message: 'Password reset successfully.' };
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

  // ---------------------------------------------------------------------------
  // Helpers privés
  // ---------------------------------------------------------------------------

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
    await this.smtpEmail.sendVerificationCode(email, code, purpose);
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
    await this.smtpEmail.sendVerificationCode(
      pending.email,
      code,
      'registration',
    );
  }

  /**
   * Vérifie l'OTP d'une pré-inscription et incrémente le compteur de tentatives.
   * @param consume Si true, supprime le codeHash après succès (pour le flux legacy).
   */
  private async checkAndConsumeOtpOnPending(
    pending: PendingRegistrationEntity,
    code: string,
    consume: boolean,
  ): Promise<void> {
    if (pending.expiresAt.getTime() <= Date.now()) {
      await this.pendingRegistrations.delete({ id: pending.id });
      throw invalidVerificationCode();
    }
    if (!pending.codeHash) {
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
    if (consume) {
      pending.codeHash = null;
    }
  }

  private async verifyPendingRegistration(
    pending: PendingRegistrationEntity,
    code: string,
  ): Promise<AuthResponse> {
    await this.checkAndConsumeOtpOnPending(pending, code, true);

    const user = await this.usersService.create({
      email: pending.email,
      username: pending.username!,
      displayName: pending.displayName,
      passwordHash: pending.passwordHash!,
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

function emailAlreadyExists(): ConflictException {
  return new ConflictException({
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Cet email est déjà associé à un compte.',
  });
}

function usernameAlreadyExists(): ConflictException {
  return new ConflictException({
    code: 'USERNAME_ALREADY_EXISTS',
    message: 'Ce pseudo est déjà utilisé.',
  });
}

function registrationConflict(message: string): ConflictException {
  return new ConflictException({
    code: 'REGISTRATION_CONFLICT',
    message,
  });
}
