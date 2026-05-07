import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const ML_SERVICE_BASE_URL = process.env.ML_SERVICE_URL;

const proxyPrediction = async (req, res, targetPath) => {
  if (!ML_SERVICE_BASE_URL) {
    return res.status(503).json({ message: 'Prediction service unavailable' });
  }

  try {
    const response = await fetch(`${ML_SERVICE_BASE_URL}${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(503).json({ message: 'Prediction service unavailable' });
  }
};

router.post('/price', authenticateToken, async (req, res) => {
  return proxyPrediction(req, res, '/predict/price');
});

router.post('/demand', authenticateToken, async (req, res) => {
  return proxyPrediction(req, res, '/predict/demand');
});

export default router;
