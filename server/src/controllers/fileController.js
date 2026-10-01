import { logger } from '../config/logger.js';
import { processUploadedFiles, deleteUploadedFiles } from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';

// Upload files for complaint — now streams to Cloudinary (cloud file storage)
// instead of writing to the local 'uploads/complaints' folder.
export const uploadComplaintFiles = async (req, res) => {
  try {
    const files = await processUploadedFiles(req.files);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    logger.info(`Files uploaded to Cloudinary for complaint by user: ${req.user.email}`, {
      userId: req.user._id,
      fileCount: files.length,
      files: files.map(f => f.originalName)
    });

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: { files }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
};

// Get file info from Cloudinary. publicId is passed as a query param because
// Cloudinary public_ids contain '/' (e.g. cms/complaints/abc123), which doesn't
// fit cleanly into a single Express route segment.
export const getFileInfo = async (req, res) => {
  try {
    const { publicId } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId query parameter is required' });
    }

    const result = await cloudinary.api.resource(publicId, { resource_type: 'auto' });

    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        size: result.bytes,
        created: result.created_at,
        url: result.secure_url,
        format: result.format
      }
    });
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    logger.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file info'
    });
  }
};

// Download file — redirect to Cloudinary's secure URL with fl_attachment so the
// browser downloads rather than displays it. No file ever touches our server.
export const downloadFile = async (req, res) => {
  try {
    const { publicId } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId query parameter is required' });
    }

    const result = await cloudinary.api.resource(publicId, { resource_type: 'auto' });
    const downloadUrl = cloudinary.url(publicId, {
      resource_type: result.resource_type,
      flags: 'attachment',
      secure: true
    });

    logger.info(`File download requested: ${publicId}`, {
      userId: req.user._id,
      ip: req.ip
    });

    res.redirect(downloadUrl);
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    logger.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed'
    });
  }
};

// Delete file from Cloudinary (admin only — see routes/files.js)
export const deleteFile = async (req, res) => {
  try {
    const { publicId } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId query parameter is required' });
    }

    await deleteUploadedFiles([publicId]);

    logger.info(`File deleted: ${publicId}`, {
      userId: req.user._id,
      deletedBy: req.user.email
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed'
    });
  }
};

// Get storage statistics from Cloudinary's account usage API
export const getStorageStats = async (req, res) => {
  try {
    const usage = await cloudinary.api.usage();

    res.json({
      success: true,
      data: {
        totalFiles: usage.resources,
        totalStorageBytes: usage.storage?.usage || 0,
        totalStorageMB: ((usage.storage?.usage || 0) / 1024 / 1024).toFixed(2),
        bandwidthUsedMB: ((usage.bandwidth?.usage || 0) / 1024 / 1024).toFixed(2),
        plan: usage.plan
      }
    });
  } catch (error) {
    logger.error('Get storage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get storage statistics'
    });
  }
};
