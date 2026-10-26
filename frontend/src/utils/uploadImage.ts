import { API_URL } from '../config';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_CROP_IMAGES = 5;

interface PresignResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
  publicUrl: string;
  maxBytes: number;
}

/** Returns a friendly error message if the file can't be uploaded, otherwise null. */
export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" is not a JPG, PNG or WEBP image`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is larger than 5 MB`;
  }
  return null;
};

/**
 * Uploads an image straight to S3 using a presigned POST from the backend
 * and resolves to its public URL.
 */
export async function uploadImage(file: File, kind: 'crop' | 'profile'): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const token = localStorage.getItem('token');
  const presignResponse = await fetch(`${API_URL}/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
  });
  const presign = await presignResponse.json().catch(() => ({}));
  if (!presignResponse.ok) {
    throw new Error(presign.error || 'Upload failed');
  }

  const { url, fields, publicUrl } = presign as PresignResponse;
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.append(name, value));
  // S3 ignores any field after the file, so it must be appended last
  formData.append('file', file);

  // No Authorization / Content-Type headers: the browser sets the multipart boundary
  const uploadResponse = await fetch(url, { method: 'POST', body: formData });
  if (!uploadResponse.ok) {
    throw new Error('Upload to storage failed');
  }

  return publicUrl;
}
