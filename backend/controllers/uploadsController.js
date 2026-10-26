import {
  isUploadsConfigured,
  createUploadForm,
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
} from '../services/uploads.js';

// Issue a presigned S3 POST so the browser can upload an image directly
export const createPresign = async (req, res) => {
  if (!isUploadsConfigured()) {
    return res.status(503).json({ error: 'Image uploads are not configured' });
  }

  const { kind, contentType, size } = req.body || {};

  if (kind !== 'crop' && kind !== 'profile') {
    return res.status(400).json({ error: 'Invalid upload kind' });
  }
  if (kind === 'crop' && req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can upload crop images' });
  }
  if (typeof contentType !== 'string' || !Object.hasOwn(ALLOWED_TYPES, contentType)) {
    return res.status(400).json({ error: 'Only JPG, PNG or WEBP images are allowed' });
  }
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'Images must be 5 MB or smaller' });
  }

  try {
    const form = await createUploadForm({ kind, userId: req.user.id, contentType });
    res.json(form);
  } catch (err) {
    console.error('Create upload presign error:', err);
    res.status(500).json({ error: 'Could not prepare upload' });
  }
};
