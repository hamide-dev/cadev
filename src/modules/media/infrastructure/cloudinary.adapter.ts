import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { Environment } from '../../../config/environment.js';
import { MediaResourceType } from '../domain/media.types.js';

export interface CloudinaryAsset {
  publicId: string;
  resourceType: MediaResourceType;
  uploadType: string;
  format: string;
  bytes: number;
  secureUrl: string;
}

@Injectable()
export class CloudinaryAdapter {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  signUpload(parameters: Record<string, string | number | boolean>): string {
    const credentials = this.getCredentials();
    return cloudinary.utils.api_sign_request(parameters, credentials.apiSecret);
  }

  async findAsset(
    publicId: string,
    resourceType: MediaResourceType,
    uploadType: 'upload' | 'authenticated',
  ): Promise<CloudinaryAsset> {
    const credentials = this.getCredentials();
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
    let rawAsset: unknown;
    try {
      rawAsset = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: uploadType,
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new ServiceUnavailableException({
          code: 'MEDIA_UPLOAD_NOT_FOUND',
          message: 'The uploaded Cloudinary asset could not be verified.',
        });
      }
      throw new ServiceUnavailableException({
        code: 'MEDIA_PROVIDER_UNAVAILABLE',
        message: 'The media provider could not verify the upload.',
      });
    }
    if (!isRecord(rawAsset)) {
      throw new ServiceUnavailableException({
        code: 'MEDIA_PROVIDER_INVALID_RESPONSE',
        message: 'The media provider returned an invalid response.',
      });
    }
    const asset: CloudinaryAsset = {
      publicId: readString(rawAsset, 'public_id'),
      resourceType: resourceType,
      uploadType: readString(rawAsset, 'type'),
      format: readString(rawAsset, 'format').toLowerCase(),
      bytes: readNumber(rawAsset, 'bytes'),
      secureUrl: readString(rawAsset, 'secure_url'),
    };
    if (
      !asset.publicId ||
      !asset.format ||
      !asset.secureUrl.startsWith('https://') ||
      !Number.isSafeInteger(asset.bytes) ||
      asset.bytes < 1
    ) {
      throw new ServiceUnavailableException({
        code: 'MEDIA_PROVIDER_INVALID_RESPONSE',
        message: 'The media provider returned invalid asset metadata.',
      });
    }
    return asset;
  }

  createPrivateDeliveryUrl(
    publicId: string,
    format: string,
    resourceType: MediaResourceType,
    expiresAt: number,
  ): string {
    const credentials = this.getCredentials();
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'authenticated',
      expires_at: expiresAt,
    });
  }

  getCloudName(): string {
    return this.getCredentials().cloudName;
  }

  getApiKey(): string {
    return this.getCredentials().apiKey;
  }

  private getCredentials(): {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  } {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException({
        code: 'MEDIA_PROVIDER_NOT_CONFIGURED',
        message: 'Media uploads are not configured on this server.',
      });
    }
    return { cloudName, apiKey, apiSecret };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' ? value : Number.NaN;
}

function isNotFound(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const httpCode = error.http_code;
  return httpCode === 404;
}
