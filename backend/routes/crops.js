import express from 'express';
import * as cropsController from '../controllers/cropsController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', cropsController.getAllCrops);
router.get('/:id', cropsController.getCropById);
router.get('/farmer/:farmerId', cropsController.getCropsByFarmer);

// Protected farmer routes
router.post('/', authenticateToken, requireRole('farmer'), cropsController.createCrop);
router.put('/:id', authenticateToken, requireRole('farmer'), cropsController.updateCrop);
router.delete('/:id', authenticateToken, requireRole('farmer'), cropsController.deleteCrop);

export default router;
