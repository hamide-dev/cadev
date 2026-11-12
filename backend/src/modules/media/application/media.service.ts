import {
  ConflictException,
  ForbiddenException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, IsNull, Repository } from 'typeorm';
import { UsersService } from '../../users/application/users.service.js';
import { ConversationMemberEntity } from '../../messaging/infrastructure/conversation.entity.js';
import { MediaPurpose, MediaResourceType } from '../domain/media.types.js';
import type {
  PublicMessageMedia,
  PublicPostMedia,
  UploadSignature,
} from '../domain/media.types.js';
import { MediaAssetEntity } from '../infrastructure/media-asset.entity.js';
import { CloudinaryAdapter } from '../infrastructure/cloudinary.adapter.js';

const PROFILE_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const CHAT_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const CHAT_VIDEO_FORMATS = ['mp4', 'webm', 'mov'];
const POST_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const POST_VIDEO_FORMATS = ['mp4', 'webm', 'mov'];
const PROFILE_MAX_BYTES = 5 * 1024 * 1024;
const CHAT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const CHAT_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const POST_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const PRIVATE_URL_TTL_SECONDS = 10 * 60;

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinary: CloudinaryAdapter,
    private readonly usersService: UsersService,
    @InjectRepository(MediaAssetEntity)
    private readonly assets: Repository<MediaAssetEntity>,
    @InjectRepository(ConversationMemberEntity)
    private readonly conversationMembers: Repository<ConversationMemberEntity>,
  ) {}

  createProfileImageSignature(userId: string): UploadSignature {
    return this.createSignature(
      `hello-world/profiles/${userId}/${randomUUID()}`,
      MediaResourceType.IMAGE,
      'upload',
      PROFILE_MAX_BYTES,
      PROFILE_IMAGE_FORMATS,
    );
  }

  async confirmProfileImage(
    userId: string,
    publicId: string,
  ): Promise<{ avatarUrl: string }> {
    assertPublicIdPrefix(publicId, `hello-world/profiles/${userId}/`);
    const existing = await this.assets.findOneBy({
      cloudPublicId: publicId,
    });
    if (existing) {
      if (
        existing.ownerId !== userId ||
        existing.purpose !== MediaPurpose.PROFILE
      ) {
        throw new ConflictException({
          code: 'MEDIA_ASSET_CONFLICT',
          message: 'This media asset cannot be used as this profile image.',
        });
      }
      if (!existing.publicUrl) {
        throw new ConflictException({
          code: 'MEDIA_ASSET_INVALID',
          message: 'The profile image has no public delivery URL.',
        });
      }
      await this.usersService.updateAvatarUrl(userId, existing.publicUrl);
      return { avatarUrl: existing.publicUrl };
    }
    const cloudAsset = await this.cloudinary.findAsset(
      publicId,
      MediaResourceType.IMAGE,
      'upload',
    );
    assertVerifiedAsset(
      cloudAsset,
      publicId,
      MediaResourceType.IMAGE,
      'upload',
      PROFILE_IMAGE_FORMATS,
      PROFILE_MAX_BYTES,
    );
    await this.assets.save(
      this.assets.create({
        ownerId: userId,
        purpose: MediaPurpose.PROFILE,
        resourceType: MediaResourceType.IMAGE,
        cloudPublicId: cloudAsset.publicId,
        format: cloudAsset.format,
        bytes: cloudAsset.bytes,
        publicUrl: cloudAsset.secureUrl,
        conversationId: null,
        messageId: null,
      }),
    );
    await this.usersService.updateAvatarUrl(userId, cloudAsset.secureUrl);
    return { avatarUrl: cloudAsset.secureUrl };
  }

  async createChatUploadSignature(
    userId: string,
    conversationId: string,
    resourceType: MediaResourceType,
  ): Promise<UploadSignature> {
    await this.assertConversationMember(conversationId, userId);
    const formats = chatFormatsFor(resourceType);
    return this.createSignature(
      `hello-world/chats/${conversationId}/${userId}/${randomUUID()}`,
      resourceType,
      'authenticated',
      chatMaxBytesFor(resourceType),
      formats,
    );
  }

  async confirmChatUpload(
    userId: string,
    conversationId: string,
    publicId: string,
    resourceType: MediaResourceType,
  ): Promise<PublicMessageMedia> {
    await this.assertConversationMember(conversationId, userId);
    assertPublicIdPrefix(
      publicId,
      `hello-world/chats/${conversationId}/${userId}/`,
    );
    const existing = await this.assets.findOneBy({
      cloudPublicId: publicId,
    });
    if (existing) {
      if (
        existing.ownerId !== userId ||
        existing.conversationId !== conversationId ||
        existing.purpose !== MediaPurpose.CHAT
      ) {
        throw new ConflictException({
          code: 'MEDIA_ASSET_CONFLICT',
          message: 'This media asset cannot be used in this conversation.',
        });
      }
      return this.toPublicMessageMedia(existing);
    }
    const cloudAsset = await this.cloudinary.findAsset(
      publicId,
      resourceType,
      'authenticated',
    );
    assertVerifiedAsset(
      cloudAsset,
      publicId,
      resourceType,
      'authenticated',
      chatFormatsFor(resourceType),
      chatMaxBytesFor(resourceType),
    );
    const asset = await this.assets.save(
      this.assets.create({
        ownerId: userId,
        purpose: MediaPurpose.CHAT,
        resourceType,
        cloudPublicId: cloudAsset.publicId,
        format: cloudAsset.format,
        bytes: cloudAsset.bytes,
        publicUrl: null,
        conversationId,
        messageId: null,
      }),
    );
    return this.toPublicMessageMedia(asset);
  }

  createPostUploadSignature(
    userId: string,
    resourceType: MediaResourceType,
  ): UploadSignature {
    return this.createSignature(
      `hello-world/posts/${userId}/${randomUUID()}`,
      resourceType,
      'upload',
      postMaxBytesFor(resourceType),
      postFormatsFor(resourceType),
    );
  }

  async confirmPostUpload(
    userId: string,
    publicId: string,
    resourceType: MediaResourceType,
  ): Promise<PublicPostMedia> {
    assertPublicIdPrefix(publicId, `hello-world/posts/${userId}/`);
    const existing = await this.assets.findOneBy({ cloudPublicId: publicId });
    if (existing) {
      if (existing.ownerId !== userId || existing.purpose !== MediaPurpose.POST) {
        throw new ConflictException({
          code: 'MEDIA_ASSET_CONFLICT',
          message: 'This asset cannot be used as a post attachment.',
        });
      }
      return this.toPublicPostMedia(existing);
    }
    const cloudAsset = await this.cloudinary.findAsset(
      publicId,
      resourceType,
      'upload',
    );
    assertVerifiedAsset(
      cloudAsset,
      publicId,
      resourceType,
      'upload',
      postFormatsFor(resourceType),
      postMaxBytesFor(resourceType),
    );
    const asset = await this.assets.save(
      this.assets.create({
        ownerId: userId,
        purpose: MediaPurpose.POST,
        resourceType,
        cloudPublicId: cloudAsset.publicId,
        format: cloudAsset.format,
        bytes: cloudAsset.bytes,
        publicUrl: cloudAsset.secureUrl,
        conversationId: null,
        messageId: null,
        postId: null,
      }),
    );
    return this.toPublicPostMedia(asset);
  }

  async attachPostAssets(
    ownerId: string,
    postId: string,
    assetIds: string[],
  ): Promise<void> {
    if (assetIds.length === 0) return;
    const assets = await this.assets.find({
      where: {
        id: In(assetIds),
        ownerId,
        purpose: MediaPurpose.POST,
        postId: IsNull(),
      },
    });
    if (assets.length !== assetIds.length) {
      throw new ConflictException({
        code: 'MEDIA_ASSET_NOT_ATTACHABLE',
        message: 'Every post attachment must be your unassigned upload.',
      });
    }
    const result = await this.assets.update(
      {
        id: In(assetIds),
        ownerId,
        purpose: MediaPurpose.POST,
        postId: IsNull(),
      },
      { postId },
    );
    if (result.affected !== assetIds.length) {
      throw new ConflictException({
        code: 'MEDIA_ASSET_NOT_ATTACHABLE',
        message: 'One or more post attachments have already been used.',
      });
    }
  }

  async getPublicPostAttachments(
    postIds: string[],
  ): Promise<Map<string, PublicPostMedia[]>> {
    if (postIds.length === 0) return new Map();
    const assets = await this.assets.find({
      where: { postId: In(postIds), purpose: MediaPurpose.POST },
      order: { createdAt: 'ASC' },
    });
    const result = new Map<string, PublicPostMedia[]>();
    for (const asset of assets) {
      if (!asset.postId) continue;
      const list = result.get(asset.postId) ?? [];
      list.push(this.toPublicPostMedia(asset));
      result.set(asset.postId, list);
    }
    return result;
  }

  async getAttachableChatAssets(
    ownerId: string,
    conversationId: string,
    assetIds: string[],
  ): Promise<MediaAssetEntity[]> {
    if (assetIds.length === 0) return [];
    const assets = await this.assets.find({
      where: {
        id: In(assetIds),
        ownerId,
        conversationId,
        purpose: MediaPurpose.CHAT,
        messageId: IsNull(),
      },
    });
    if (assets.length !== assetIds.length) {
      throw new ConflictException({
        code: 'MEDIA_ASSET_NOT_ATTACHABLE',
        message:
          'Every attachment must be an unassigned upload owned by you in this conversation.',
      });
    }
    return assets;
  }

  async getPublicAttachments(
    messageIds: string[],
  ): Promise<Map<string, PublicMessageMedia[]>> {
    if (messageIds.length === 0) return new Map();
    const assets = await this.assets.find({
      where: { messageId: In(messageIds), purpose: MediaPurpose.CHAT },
      order: { createdAt: 'ASC' },
    });
    const result = new Map<string, PublicMessageMedia[]>();
    for (const asset of assets) {
      if (!asset.messageId) continue;
      const list = result.get(asset.messageId) ?? [];
      list.push(this.toPublicMessageMedia(asset));
      result.set(asset.messageId, list);
    }
    return result;
  }

  private async assertConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.conversationMembers.findOneBy({
      conversationId,
      userId,
    });
    if (!member) {
      throw new ForbiddenException({
        code: 'CONVERSATION_ACCESS_DENIED',
        message: 'You are not a member of this conversation.',
      });
    }
  }

  private createSignature(
    publicId: string,
    resourceType: MediaResourceType,
    uploadType: 'upload' | 'authenticated',
    maxBytes: number,
    formats: string[],
  ): UploadSignature {
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = {
      allowed_formats: formats.join(','),
      overwrite: false,
      public_id: publicId,
      timestamp,
      type: uploadType,
    };
    return {
      cloudName: this.cloudinary.getCloudName(),
      apiKey: this.cloudinary.getApiKey(),
      timestamp,
      signature: this.cloudinary.signUpload(parameters),
      publicId,
      resourceType,
      uploadType,
      maxBytes,
    };
  }

  private toPublicMessageMedia(asset: MediaAssetEntity): PublicMessageMedia {
    const expiresAt = Math.floor(Date.now() / 1000) + PRIVATE_URL_TTL_SECONDS;
    return {
      id: asset.id,
      resourceType: asset.resourceType,
      format: asset.format,
      bytes: asset.bytes,
      url: this.cloudinary.createPrivateDeliveryUrl(
        asset.cloudPublicId,
        asset.format,
        asset.resourceType,
        expiresAt,
      ),
      urlExpiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  private toPublicPostMedia(asset: MediaAssetEntity): PublicPostMedia {
    if (!asset.publicUrl) {
      throw new ConflictException({
        code: 'MEDIA_ASSET_INVALID',
        message: 'The post attachment has no public delivery URL.',
      });
    }
    return {
      id: asset.id,
      resourceType: asset.resourceType,
      format: asset.format,
      bytes: asset.bytes,
      url: asset.publicUrl,
    };
  }
}

function assertPublicIdPrefix(publicId: string, prefix: string): void {
  if (
    !publicId.startsWith(prefix) ||
    !/^[a-f0-9-]{36}$/.test(publicId.slice(prefix.length))
  ) {
    throw new UnprocessableEntityException({
      code: 'INVALID_MEDIA_ID',
      message: 'The Cloudinary public id was not issued for this upload.',
    });
  }
}

function assertVerifiedAsset(
  asset: {
    publicId: string;
    resourceType: MediaResourceType;
    uploadType: string;
    format: string;
    bytes: number;
  },
  expectedPublicId: string,
  resourceType: MediaResourceType,
  uploadType: string,
  allowedFormats: string[],
  maxBytes: number,
): void {
  if (
    asset.publicId !== expectedPublicId ||
    asset.resourceType !== resourceType ||
    asset.uploadType !== uploadType
  ) {
    throw new UnprocessableEntityException({
      code: 'MEDIA_METADATA_MISMATCH',
      message: 'The uploaded asset does not match its signed upload request.',
    });
  }
  if (!allowedFormats.includes(asset.format)) {
    throw new UnprocessableEntityException({
      code: 'MEDIA_FORMAT_NOT_ALLOWED',
      message: 'This media format is not supported.',
    });
  }
  if (asset.bytes > maxBytes) {
    throw new PayloadTooLargeException({
      code: 'MEDIA_TOO_LARGE',
      message: 'The uploaded media exceeds the allowed size.',
    });
  }
}

function chatFormatsFor(resourceType: MediaResourceType): string[] {
  return resourceType === MediaResourceType.IMAGE
    ? CHAT_IMAGE_FORMATS
    : CHAT_VIDEO_FORMATS;
}

function chatMaxBytesFor(resourceType: MediaResourceType): number {
  return resourceType === MediaResourceType.IMAGE
    ? CHAT_IMAGE_MAX_BYTES
    : CHAT_VIDEO_MAX_BYTES;
}

function postFormatsFor(resourceType: MediaResourceType): string[] {
  return resourceType === MediaResourceType.IMAGE
    ? POST_IMAGE_FORMATS
    : POST_VIDEO_FORMATS;
}

function postMaxBytesFor(resourceType: MediaResourceType): number {
  return resourceType === MediaResourceType.IMAGE
    ? POST_IMAGE_MAX_BYTES
    : POST_VIDEO_MAX_BYTES;
}
