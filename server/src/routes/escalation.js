import express from 'express';
import { getEscalatedComplaints } from '../controllers/escalationController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorize('master_admin', 'sub_admin'));

// GET /api/escalated — returns all SLA-breached unresolved complaints
router.get('/', getEscalatedComplaints);

export default router;
