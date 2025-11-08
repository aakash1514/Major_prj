import pool from '../db.js';

// Create quality report
export const createQualityReport = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { cropId, weight, size, condition, images, notes, recommendation } = req.body;

    if (!cropId || !recommendation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO quality_reports (crop_id, agent_id, weight, size, condition, images, notes, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [cropId, agentId, weight, size, condition, images || [], notes, recommendation]
    );

    // Update crop status based on recommendation
    const newStatus = recommendation === 'approve' ? 'inspected' : 'rejected';
    await pool.query(
      'UPDATE crops SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, cropId]
    );

    res.status(201).json({
      message: 'Quality report created successfully',
      report: result.rows[0]
    });
  } catch (err) {
    console.error('Create quality report error:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get quality reports for crop
export const getQualityReportsByCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    const result = await pool.query(
      'SELECT * FROM quality_reports WHERE crop_id = $1 ORDER BY created_at DESC',
      [cropId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get quality reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get all pending inspections for agent
export const getPendingInspections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.* FROM crops c
       WHERE c.status = $1
       ORDER BY c.created_at ASC`,
      ['pending']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get pending inspections error:', err);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
};

// Get deliveries for agent
export const getDeliveries = async (req, res) => {
  try {
    const agentId = req.user.id;
    const result = await pool.query(
      `SELECT tl.*, o.*, c.name as crop_name FROM transport_logs tl
       JOIN orders o ON tl.order_id = o.id
       JOIN crops c ON tl.crop_id = c.id
       WHERE tl.agent_id = $1
       ORDER BY tl.created_at DESC`,
      [agentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get deliveries error:', err);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
};

// Update delivery status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status, pickupDate, deliveryDate, notes } = req.body;

    const result = await pool.query(
      `UPDATE transport_logs SET 
        status = COALESCE($1, status),
        pickup_date = COALESCE($2, pickup_date),
        delivery_date = COALESCE($3, delivery_date),
        notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, pickupDate, deliveryDate, notes, deliveryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({
      message: 'Delivery updated successfully',
      delivery: result.rows[0]
    });
  } catch (err) {
    console.error('Update delivery error:', err);
    res.status(500).json({ error: 'Failed to update delivery' });
  }
};

// Get all agents (for admin to assign)
export const getAllAgents = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, contact_number FROM users WHERE role = $1 ORDER BY name ASC',
      ['agent']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get agents error:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

// Get agent's assigned deliveries (orders assigned to agent) - includes all statuses
export const getAgentDeliveries = async (req, res) => {
  try {
    const agentId = req.user.id;
    console.log('[DEBUG] getAgentDeliveries called for agent:', agentId);
    const result = await pool.query(
      `SELECT o.*, c.name as crop_name, u.name as buyer_name 
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       JOIN users u ON o.buyer_id = u.id
       WHERE o.transporter_id = $1 AND o.status IN ('assigned', 'in-transit', 'delivered')
       ORDER BY o.created_at DESC`,
      [agentId]
    );
    console.log('[DEBUG] Found', result.rows.length, 'orders for agent');
    
    // Convert numeric fields
    const orders = result.rows.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) || 0,
      advance_amount: parseFloat(order.advance_amount) || 0,
      quantity: parseInt(order.quantity) || 0
    }));
    
    res.json(orders);
  } catch (err) {
    console.error('Get agent deliveries error:', err);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
};
