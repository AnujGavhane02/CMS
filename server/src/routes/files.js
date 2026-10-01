import express from 'express';
import {
  uploadComplaintFiles,
  getFileInfo,
  downloadFile,
  deleteFile,
  getStorageStats
} from '../controllers/fileController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';
import { fileUploadLimiter } from '../middleware/rateLimiter.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Upload files for complaint
router.post('/upload', fileUploadLimiter, uploadMultiple('files', 5), uploadComplaintFiles);

// Get file information (Cloudinary public_id passed as ?publicId=...)
router.get('/info', getFileInfo);

// Download file (Cloudinary public_id passed as ?publicId=...)
router.get('/download', downloadFile);

// Delete file (admin only, Cloudinary public_id passed as ?publicId=...)
router.delete('/', authorize('master_admin', 'sub_admin'), deleteFile);

// Get storage statistics (admin only)
router.get('/stats', authorize('master_admin'), generalLimiter, getStorageStats);

export default router;
