import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../database/is-unique-violation.js';
import type { PublicUser } from '../domain/user.types.js';
import { UserEntity } from '../infrastructure/user.entity.js';
import { UserFollowEntity } from '../infrastructure/user-follow.entity.js';
import type { UpdateProfileDto } from '../presentation/dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserFollowEntity)
    private readonly follows: Repository<UserFollowEntity>,
  ) {}

  async create(input: {
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
    emailVerified?: boolean;
  }): Promise<UserEntity> {
    const user = this.users.create({
      ...input,
      emailVerified: input.emailVerified ?? false,
      googleId: null,
      githubId: null,
      bio: null,
      avatarUrl: null,
      githubUrl: null,
      specialty: null,
      experienceLevel: null,
      interests: [],
      technologies: [],
    });
    try {
      return await this.users.save(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'ACCOUNT_ALREADY_EXISTS',
          message: 'An account with this email or username already exists.',
        });
      }
      throw error;
    }
  }

  async findByEmailForAuthentication(
    email: string,
  ): Promise<UserEntity | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ email });
  }

  async findByOAuthIdentity(
    provider: 'google' | 'github',
    providerId: string,
  ): Promise<UserEntity | null> {
    return provider === 'google'
      ? this.users.findOneBy({ googleId: providerId })
      : this.users.findOneBy({ githubId: providerId });
  }

  async createOrLinkOAuthUser(input: {
    provider: 'google' | 'github';
    providerId: string;
    email: string;
    displayName: string;
  }): Promise<UserEntity> {
    const providerField = input.provider === 'google' ? 'googleId' : 'githubId';
    const existing = await this.findByEmail(input.email);
    if (existing) {
      if (!existing.emailVerified) {
        throw new ConflictException({
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: 'Verify this email address before using social sign-in.',
        });
      }
      const linkedProviderId = existing[providerField];
      if (linkedProviderId && linkedProviderId !== input.providerId) {
        throw new ConflictException({
          code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
          message: 'This email is linked to another provider account.',
        });
      }
      existing[providerField] = input.providerId;
      return this.users.save(existing);
    }

    const suffix = createHash('sha256')
      .update(`${input.provider}:${input.providerId}`)
      .digest('hex')
      .slice(0, 8);
    const emailName = input.email
      .split('@')[0]!
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 11);
    const user = this.users.create({
      email: input.email,
      username: `${emailName || 'developer'}_${suffix}`,
      displayName: input.displayName.slice(0, 80),
      passwordHash: null,
      emailVerified: true,
      googleId: input.provider === 'google' ? input.providerId : null,
      githubId: input.provider === 'github' ? input.providerId : null,
      bio: null,
      avatarUrl: null,
      githubUrl: null,
      specialty: null,
      experienceLevel: null,
      interests: [],
      technologies: [],
    });
    try {
      return await this.users.save(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const concurrentAccount = await this.findByOAuthIdentity(
          input.provider,
          input.providerId,
        );
        if (concurrentAccount) return concurrentAccount;
        throw new ConflictException({
          code: 'OAUTH_ACCOUNT_CONFLICT',
          message: 'An account with this email or provider already exists.',
        });
      }
      throw error;
    }
  }

  async markEmailVerified(id: string): Promise<UserEntity> {
    await this.users.update({ id }, { emailVerified: true });
    return this.findById(id);
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    return user;
  }

  async findPublicByUsername(username: string): Promise<PublicUser> {
    const user = await this.users.findOneBy({ username });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    return toPublicUser(user);
  }

  async updateProfile(
    id: string,
    input: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.findById(id);
    if (input.username !== undefined)
      user.username = input.username.toLowerCase();
    if (input.displayName !== undefined) user.displayName = input.displayName;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.githubUrl !== undefined) user.githubUrl = input.githubUrl;
    if (input.specialty !== undefined) user.specialty = input.specialty;
    if (input.experienceLevel !== undefined)
      user.experienceLevel = input.experienceLevel;
    if (input.interests !== undefined)
      user.interests = normalizeProfileTags(input.interests);
    if (input.technologies !== undefined)
      user.technologies = normalizeProfileTags(input.technologies);
    try {
      return toPublicUser(await this.users.save(user));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'HANDLE_ALREADY_TAKEN',
          message: 'This handle is already in use.',
        });
      }
      throw error;
    }
  }

  async updateAvatarUrl(id: string, avatarUrl: string): Promise<void> {
    await this.users.update({ id }, { avatarUrl });
  }

  async follow(followerId: string, username: string): Promise<void> {
    const followed = await this.users.findOneBy({
      username: username.toLowerCase().replace(/^@/, ''),
    });
    if (!followed) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    if (followed.id === followerId) {
      throw new ForbiddenException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    const existing = await this.follows.findOneBy({
      followerId,
      followedId: followed.id,
    });
    if (existing) return;
    try {
      await this.follows.save(
        this.follows.create({ followerId, followedId: followed.id }),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  async unfollow(followerId: string, username: string): Promise<void> {
    const followed = await this.users.findOneBy({
      username: username.toLowerCase().replace(/^@/, ''),
    });
    if (!followed) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    }
    await this.follows.delete({ followerId, followedId: followed.id });
  }

  toPublic(user: UserEntity, includeEmail = false): PublicUser {
    return toPublicUser(user, includeEmail);
  }
}

export function toPublicUser(
  user: UserEntity,
  includeEmail = false,
): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    ...(includeEmail ? { email: user.email } : {}),
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    githubUrl: user.githubUrl,
    specialty: user.specialty,
    experienceLevel: user.experienceLevel,
    interests: user.interests ?? [],
    technologies: user.technologies ?? [],
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeProfileTags(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
