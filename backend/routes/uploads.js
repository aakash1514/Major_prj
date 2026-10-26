import express from 'express';
import * as uploadsController from '../controllers/uploadsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/presign', authenticateToken, uploadsController.createPresign);

export default router;
