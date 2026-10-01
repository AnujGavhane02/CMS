import express from 'express';
import { chat } from '../controllers/chatController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, chat);

export default router;
