import express from 'express';
import * as ordersController from '../controllers/ordersController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.post('/', authenticateToken, ordersController.createOrder);
router.get('/', authenticateToken, ordersController.getAllOrders);
router.get('/payment-history', authenticateToken, ordersController.getPaymentHistory);
router.post('/:id/payment/create-order', authenticateToken, requireRole('buyer'), ordersController.createRazorpayOrder);
router.get('/:id/payment/checkout', ordersController.renderRazorpayCheckout);
router.post('/:id/payment/verify', authenticateToken, requireRole('buyer'), ordersController.verifyRazorpayPayment);
router.put('/:id/settle-farmer', authenticateToken, requireRole('admin'), ordersController.settleFarmerPayment);
router.get('/:id/payment-status', authenticateToken, ordersController.getOrderPaymentStatus);
router.get('/:id', authenticateToken, ordersController.getOrderById);
router.put('/:id/status', authenticateToken, ordersController.updateOrderStatus);
router.put('/:id/payment', authenticateToken, ordersController.updateOrderPayment);
router.put('/:id/cancel', authenticateToken, ordersController.cancelOrder);

export default router;
