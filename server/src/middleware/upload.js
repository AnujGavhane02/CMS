import multer from 'multer';
import { logger } from '../config/logger.js';

// CLOUD MIGRATION: files are now held in memory only long enough to stream them
// to Cloudinary (see fileController.js) — nothing is written to local disk anymore.
// This is what makes file storage work the same way whether the server runs on
// a laptop or on an ephemeral cloud host like Render (whose local disk is wiped
// on every redeploy).
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`File upload rejected: ${file.originalname} (${file.mimetype})`, {
      ip: req.ip,
      userId: req.user?.id
    });
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    files: 5 // Maximum 5 files per request
  }
});

// Single file upload middleware
export const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds maximum allowed size of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Multiple files upload middleware
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds maximum allowed size of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files uploaded. Maximum ${maxCount} files allowed`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Fields upload middleware (for different field names)
export const uploadFields = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds maximum allowed size of ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Helper function to stream one in-memory file buffer up to Cloudinary.
// resource_type: 'auto' lets Cloudinary correctly handle both images and raw
// files (PDFs, .doc/.docx) in the same upload flow.
const uploadBufferToCloudinary = (file) => {
  return new Promise(async (resolve, reject) => {
    const cloudinary = (await import('../config/cloudinary.js')).default;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'cms/complaints',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });
};

// Helper function to process uploaded files: uploads each buffer to Cloudinary
// (cloud file storage) and returns metadata to store on the Complaint document.
export const processUploadedFiles = async (files) => {
  if (!files) return [];

  const fileArray = Array.isArray(files) ? files : [files];

  const uploaded = [];
  for (const file of fileArray) {
    try {
      const result = await uploadBufferToCloudinary(file);
      uploaded.push({
        filename: result.public_id.split('/').pop(),
        originalName: file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      });
    } catch (error) {
      logger.error(`Cloudinary upload failed for ${file.originalname}:`, error);
      throw error;
    }
  }
  return uploaded;
};

// Helper function to delete uploaded files from Cloudinary by their public_id
export const deleteUploadedFiles = async (publicIds) => {
  const cloudinary = (await import('../config/cloudinary.js')).default;
  const ids = Array.isArray(publicIds) ? publicIds : [publicIds];

  for (const publicId of ids) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
      logger.info(`File deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      logger.error(`Error deleting file ${publicId} from Cloudinary:`, error);
    }
  }
};
