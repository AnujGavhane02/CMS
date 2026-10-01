import express from 'express';
import {
  trackComplaint,
  getComplaintStatus,
  searchComplaints
} from '../controllers/trackComplaintController.js';
import { validateComplaintId } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Track complaint by ID (public endpoint)
router.get('/:complaintId', 
  validateComplaintId, 
  generalLimiter, 
  trackComplaint
);

// Get complaint status (minimal info)
router.get('/:complaintId/status', 
  validateComplaintId, 
  generalLimiter, 
  getComplaintStatus
);

// Search complaints (for admin use - requires authentication)
router.get('/search', 
  generalLimiter, 
  searchComplaints
);

export default router;

