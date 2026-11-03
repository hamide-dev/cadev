import type { Media, UploadSignature } from './types';
import { ApiError } from './client';
import { api } from './endpoints';
// Doit reprendre exactement les formats signés par le back (media.service.ts),
// sinon Cloudinary refuse la signature. Le back ne les renvoie pas encore.
const FORMATS = { profile: 'jpg,jpeg,png,webp', image: 'jpg,jpeg,png,webp,gif', video: 'mp4,webm,mov' };

export async function uploadToCloudinary(sig: UploadSignature, file: File, formats: keyof typeof FORMATS): Promise<void> {
  const signatureAge = Math.floor(Date.now() / 1000) - sig.timestamp;
  if (signatureAge < -30 || signatureAge > 300) {
    throw new ApiError(409, 'STALE_UPLOAD_SIGNATURE', 'La signature Cloudinary a expiré. Demande une nouvelle signature.');
  }
  if (file.size > sig.maxBytes) {
    throw new ApiError(413, 'TOO_LARGE', `Ce fichier dépasse ${Math.round(sig.maxBytes / 1024 / 1024)} Mo.`);
  }
  const form = new FormData();
  form.set('file', file);
  form.set('api_key', sig.apiKey);
  form.set('timestamp', String(sig.timestamp));
  form.set('signature', sig.signature);
  form.set('public_id', sig.publicId);
  form.set('type', sig.uploadType);
  form.set('overwrite', 'false');
  form.set('allowed_formats', FORMATS[formats]);
  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`, {
    method: 'POST',
    body: form,
    });
  } catch {
    throw new ApiError(502, 'UPLOAD_FAILED', "Cloudinary est inaccessible. Vérifie ta connexion et la configuration média du serveur.");
  }
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ? ` ${body.error.message}` : '';
    } catch {
      // The provider may return a non-JSON error page.
    }
    const stale = /stale request|reported time/i.test(detail);
    throw new ApiError(
      response.status,
      stale ? 'STALE_UPLOAD_SIGNATURE' : 'UPLOAD_FAILED',
      stale
        ? 'La signature Cloudinary a expiré. Une nouvelle signature est nécessaire.'
        : `Cloudinary a refusé le fichier.${detail}`,
    );
  }
}

export async function uploadPostToCloudinary(
  resourceType: 'image' | 'video',
  file: File,
): Promise<Media> {
  let signature = await api.postSignature(resourceType);
  try {
    await uploadToCloudinary(signature, file, resourceType);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'STALE_UPLOAD_SIGNATURE') {
      throw error;
    }
    signature = await api.postSignature(resourceType);
    await uploadToCloudinary(signature, file, resourceType);
  }
  return api.confirmPost(signature.publicId, resourceType);
}
