import express from 'express';
import * as usersController from '../controllers/usersController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', usersController.register);
router.post('/login', usersController.login);

// Protected routes
router.get('/profile', authenticateToken, usersController.getUserProfile);
router.put('/profile', authenticateToken, usersController.updateUserProfile);

export default router;
