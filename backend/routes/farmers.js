import express from 'express';
import * as farmersController from '../controllers/farmersController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected farmer routes
router.get('/profile', authenticateToken, requireRole('farmer'), farmersController.getFarmerProfile);
router.put('/profile', authenticateToken, requireRole('farmer'), farmersController.updateFarmerProfile);
router.get('/crops', authenticateToken, requireRole('farmer'), farmersController.getFarmerCrops);
router.get('/orders', authenticateToken, requireRole('farmer'), farmersController.getFarmerOrders);
router.get('/dashboard-stats', authenticateToken, requireRole('farmer'), farmersController.getFarmerDashboardStats);

export default router;
