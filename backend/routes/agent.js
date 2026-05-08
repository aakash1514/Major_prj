import express from 'express';
import * as agentController from '../controllers/agentController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Agent profile
router.get('/profile', authenticateToken, requireRole('agent'), agentController.getAgentProfile);
router.put('/profile', authenticateToken, requireRole('agent'), agentController.updateAgentProfile);

// Quality inspection routes
router.post('/inspections', authenticateToken, requireRole('agent'), agentController.createQualityReport);
router.get('/inspections/pending', authenticateToken, requireRole('agent'), agentController.getPendingInspections);
router.get('/inspections/crop/:cropId', authenticateToken, requireRole('agent'), agentController.getQualityReportsByCrop);

// Delivery routes
router.get('/deliveries', authenticateToken, requireRole('agent'), agentController.getDeliveries);
router.put('/deliveries/:deliveryId', authenticateToken, requireRole('agent'), agentController.updateDeliveryStatus);

// Get all agents (admin only)
router.get('/list', authenticateToken, agentController.getAllAgents);

// Get agent's assigned deliveries
router.get('/my-deliveries', authenticateToken, requireRole('agent'), agentController.getAgentDeliveries);

export default router;
