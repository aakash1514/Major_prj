import express from 'express';
import * as buyersController from '../controllers/buyersController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected buyer routes
router.get('/profile', authenticateToken, requireRole('buyer'), buyersController.getBuyerProfile);
router.put('/profile', authenticateToken, requireRole('buyer'), buyersController.updateBuyerProfile);
router.get('/orders', authenticateToken, requireRole('buyer'), buyersController.getBuyerOrders);
router.get('/dashboard-stats', authenticateToken, requireRole('buyer'), buyersController.getBuyerDashboardStats);

export default router;
