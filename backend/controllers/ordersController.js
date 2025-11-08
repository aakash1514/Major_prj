import pool from '../db.js';

// Create order
export const createOrder = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { cropId, quantity, advanceAmount, totalAmount } = req.body;

    if (!cropId || !quantity || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO orders (buyer_id, crop_id, quantity, advance_amount, total_amount, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [buyerId, cropId, quantity, advanceAmount || 0, totalAmount, 'pending', 'pending']
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...result.rows[0],
        total_amount: parseFloat(result.rows[0].total_amount) || 0,
        advance_amount: parseFloat(result.rows[0].advance_amount) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    // Convert numeric fields from string to number
    const orders = result.rows.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) || 0,
      advance_amount: parseFloat(order.advance_amount) || 0,
      quantity: parseInt(order.quantity) || 0
    }));
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      ...result.rows[0],
      total_amount: parseFloat(result.rows[0].total_amount) || 0,
      advance_amount: parseFloat(result.rows[0].advance_amount) || 0,
      quantity: parseInt(result.rows[0].quantity) || 0
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, transporter_id } = req.body;

    const result = await pool.query(
      'UPDATE orders SET status = COALESCE($1, status), payment_status = COALESCE($2, payment_status), transporter_id = COALESCE($3, transporter_id), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, paymentStatus, transporter_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order updated successfully',
      order: {
        ...result.rows[0],
        total_amount: parseFloat(result.rows[0].total_amount) || 0,
        advance_amount: parseFloat(result.rows[0].advance_amount) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// Update order payment status
export const updateOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, advancePaid } = req.body;

    const result = await pool.query(
      'UPDATE orders SET payment_status = $1, advance_amount = COALESCE($2, advance_amount), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [paymentStatus, advancePaid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Payment updated successfully',
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status != $1 RETURNING *',
      ['cancelled', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    res.json({
      message: 'Order cancelled successfully',
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
