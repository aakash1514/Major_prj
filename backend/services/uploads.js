import crypto from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET;
const UPLOADS_PUBLIC_BASE_URL = (process.env.UPLOADS_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_CROP_IMAGES = 5;

export const isUploadsConfigured = () => Boolean(UPLOADS_BUCKET && UPLOADS_PUBLIC_BASE_URL);

// Default credential chain (the EC2 instance role in production); never access keys from env
let client;
const getClient = () => {
  if (!client) client = new S3Client({ region });
  return client;
};

const folderFor = (kind) => (kind === 'crop' ? 'crops' : 'profiles');

export const uploadUrlPrefix = (kind, userId) =>
  `${UPLOADS_PUBLIC_BASE_URL}/uploads/${folderFor(kind)}/${userId}/`;

export const createUploadForm = async ({ kind, userId, contentType }) => {
  const key = `uploads/${folderFor(kind)}/${userId}/${crypto.randomUUID()}.${ALLOWED_TYPES[contentType]}`;

  const { url, fields } = await createPresignedPost(getClient(), {
    Bucket: UPLOADS_BUCKET,
    Key: key,
    Expires: 300,
    Conditions: [
      ['content-length-range', 1, MAX_UPLOAD_BYTES],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });

  return { url, fields, key, publicUrl: `${UPLOADS_PUBLIC_BASE_URL}/${key}`, maxBytes: MAX_UPLOAD_BYTES };
};
