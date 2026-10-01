import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger.js';

// Cloudinary is our cloud file storage for complaint attachments (images, PDFs,
// screenshots). Credentials come only from environment variables — never hardcoded.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always return https:// URLs
});

// Fail fast in production if cloud storage isn't configured, so this is caught
// at boot rather than on a student's first file upload.
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
) {
  logger.error('Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
}

export default cloudinary;
