import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../infrastructure/user.entity.js';
import { UserFollowEntity } from '../infrastructure/user-follow.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService OAuth account linking', () => {
  it('links Google to an existing verified email account', async () => {
    const existing = Object.assign(new UserEntity(), {
      id: 'existing-user-id',
      email: 'user@example.test',
      emailVerified: true,
      googleId: null,
    });
    const users = {
      findOneBy: vi.fn().mockResolvedValue(existing),
      save: vi.fn().mockResolvedValue(existing),
    };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: getRepositoryToken(UserFollowEntity), useValue: {} },
      ],
    }).compile();

    await expect(
      module.get(UsersService).createOrLinkOAuthUser({
        provider: 'google',
        providerId: 'google-subject-id',
        email: 'user@example.test',
        displayName: 'Existing User',
      }),
    ).resolves.toBe(existing);

    expect(users.findOneBy).toHaveBeenCalledWith({
      email: 'user@example.test',
    });
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ googleId: 'google-subject-id' }),
    );
  });
});
