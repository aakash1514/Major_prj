import express from 'express';
import * as ordersController from '../controllers/ordersController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.post('/', authenticateToken, ordersController.createOrder);
router.get('/', authenticateToken, ordersController.getAllOrders);
router.get('/:id', authenticateToken, ordersController.getOrderById);
router.put('/:id/status', authenticateToken, ordersController.updateOrderStatus);
router.put('/:id/payment', authenticateToken, ordersController.updateOrderPayment);
router.put('/:id/cancel', authenticateToken, ordersController.cancelOrder);

export default router;
