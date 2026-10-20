export enum MediaPurpose {
  PROFILE = 'PROFILE',
  CHAT = 'CHAT',
}

export enum MediaResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  resourceType: MediaResourceType;
  uploadType: 'upload' | 'authenticated';
  maxBytes: number;
}

export interface PublicMessageMedia {
  id: string;
  resourceType: MediaResourceType;
  format: string;
  bytes: number;
  url: string;
  urlExpiresAt: string;
}
