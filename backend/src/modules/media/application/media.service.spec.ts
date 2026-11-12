import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../../users/application/users.service.js';
import { ConversationMemberEntity } from '../../messaging/infrastructure/conversation.entity.js';
import { CloudinaryAdapter } from '../infrastructure/cloudinary.adapter.js';
import { MediaAssetEntity } from '../infrastructure/media-asset.entity.js';
import { MediaService } from './media.service.js';

describe('MediaService', () => {
  const userId = '9dd1e06a-983c-4d68-b507-c611ca65e567';
  const conversationId = '292bbd98-e066-4550-9dbc-bb2debc54468';

  function createService(
    overrides: {
      cloudinary?: Record<string, ReturnType<typeof vi.fn>>;
      assets?: Record<string, ReturnType<typeof vi.fn>>;
      members?: Record<string, ReturnType<typeof vi.fn>>;
      users?: Record<string, ReturnType<typeof vi.fn>>;
    } = {},
  ) {
    const cloudinary = {
      getCloudName: vi.fn().mockReturnValue('cloud-test'),
      getApiKey: vi.fn().mockReturnValue('public-key'),
      signUpload: vi.fn().mockReturnValue('signed-value'),
      findAsset: vi.fn(),
      createPrivateDeliveryUrl: vi
        .fn()
        .mockReturnValue('https://media.example/signed'),
      ...overrides.cloudinary,
    };
    const assets = {
      create: vi.fn((input: object) => input),
      save: vi.fn(async (input: object) => ({ id: 'asset-id', ...input })),
      findOneBy: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      ...overrides.assets,
    };
    const members = {
      findOneBy: vi.fn().mockResolvedValue({ id: 'member-row' }),
      ...overrides.members,
    };
    const users = {
      updateAvatarUrl: vi.fn().mockResolvedValue(undefined),
      ...overrides.users,
    };
    const module = Test.createTestingModule({
      providers: [
        MediaService,
        { provide: CloudinaryAdapter, useValue: cloudinary },
        { provide: UsersService, useValue: users },
        { provide: getRepositoryToken(MediaAssetEntity), useValue: assets },
        {
          provide: getRepositoryToken(ConversationMemberEntity),
          useValue: members,
        },
      ],
    });
    return module.compile().then((compiled) => ({
      service: compiled.get(MediaService),
      cloudinary,
      assets,
      members,
      users,
    }));
  }

  it('returns a signed profile-image upload without exposing the API secret', async () => {
    const { service, cloudinary } = await createService();

    const signature = service.createProfileImageSignature(userId);

    expect(signature).toMatchObject({
      cloudName: 'cloud-test',
      apiKey: 'public-key',
      resourceType: 'image',
      uploadType: 'upload',
      maxBytes: 5 * 1024 * 1024,
      signature: 'signed-value',
    });
    expect(signature.publicId).toMatch(
      new RegExp(`^hello-world/profiles/${userId}/`),
    );
    expect(JSON.stringify(signature)).not.toContain('apiSecret');
    expect(cloudinary.signUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        public_id: signature.publicId,
        type: 'upload',
      }),
    );
  });

  it('refuses chat upload signatures when the user is not a conversation member', async () => {
    const { service, members, cloudinary } = await createService({
      members: { findOneBy: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.createChatUploadSignature(userId, conversationId, 'video'),
    ).rejects.toMatchObject({
      response: { code: 'CONVERSATION_ACCESS_DENIED' },
    });
    expect(cloudinary.signUpload).not.toHaveBeenCalled();
    expect(members.findOneBy).toHaveBeenCalledWith({
      conversationId,
      userId,
    });
  });

  it('verifies profile uploads with Cloudinary before assigning the avatar', async () => {
    const publicId = `hello-world/profiles/${userId}/12345678-1234-4234-8234-123456789abc`;
    const cloudAsset = {
      publicId,
      resourceType: 'image',
      uploadType: 'upload',
      format: 'webp',
      bytes: 1024,
      secureUrl:
        'https://res.cloudinary.com/cloud-test/image/upload/avatar.webp',
    };
    const { service, cloudinary, users, assets } = await createService({
      cloudinary: { findAsset: vi.fn().mockResolvedValue(cloudAsset) },
    });

    const result = await service.confirmProfileImage(userId, publicId);

    expect(cloudinary.findAsset).toHaveBeenCalledWith(
      publicId,
      'image',
      'upload',
    );
    expect(assets.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: userId,
        cloudPublicId: publicId,
        publicUrl: cloudAsset.secureUrl,
      }),
    );
    expect(users.updateAvatarUrl).toHaveBeenCalledWith(
      userId,
      cloudAsset.secureUrl,
    );
    expect(result).toEqual({ avatarUrl: cloudAsset.secureUrl });
  });

  it('does not trust a public id outside the authenticated user folder', async () => {
    const { service, cloudinary } = await createService();

    await expect(
      service.confirmProfileImage(
        userId,
        'hello-world/profiles/another-user/12345678-1234-4234-8234-123456789abc',
      ),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_MEDIA_ID' },
    });
    expect(cloudinary.findAsset).not.toHaveBeenCalled();
  });
});
