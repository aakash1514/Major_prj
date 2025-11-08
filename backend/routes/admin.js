import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected admin routes
router.get('/users', authenticateToken, requireRole('admin'), adminController.getAllUsers);
router.get('/crops', authenticateToken, requireRole('admin'), adminController.getAllCrops);
router.post('/crops/:cropId/approve', authenticateToken, requireRole('admin'), adminController.approveCrop);
router.post('/crops/:cropId/reject', authenticateToken, requireRole('admin'), adminController.rejectCrop);
router.post('/crops/:cropId/list', authenticateToken, requireRole('admin'), adminController.listCropOnMarketplace);
router.get('/orders', authenticateToken, requireRole('admin'), adminController.getAllOrders);
router.get('/stats', authenticateToken, requireRole('admin'), adminController.getDashboardStats);

export default router;
