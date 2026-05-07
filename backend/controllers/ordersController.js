import crypto from 'crypto';
import Razorpay from 'razorpay';
import pool from '../db.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    })
  : null;

const mapOrderNumbers = (order) => ({
  ...order,
  total_amount: parseFloat(order.total_amount) || 0,
  advance_amount: parseFloat(order.advance_amount) || 0,
  quantity: parseFloat(order.quantity) || 0
});

const createPaymentAuditEntry = async ({
  orderId,
  actorId,
  action,
  note = null,
  previousState = null,
  nextState = null
}) => {
  try {
    await pool.query(
      `INSERT INTO payment_audit_logs (order_id, actor_id, action, note, previous_state, next_state)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        orderId,
        actorId || null,
        action,
        note,
        previousState ? JSON.stringify(previousState) : null,
        nextState ? JSON.stringify(nextState) : null
      ]
    );
  } catch (err) {
    console.error('Payment audit log error:', err);
  }
};

// Create order
export const createOrder = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ error: 'Only buyers can place orders' });
    }

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
      order: mapOrderNumbers(result.rows[0])
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
    const orders = result.rows.map(mapOrderNumbers);
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

    res.json(mapOrderNumbers(result.rows[0]));
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
      order: mapOrderNumbers(result.rows[0])
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
      order: mapOrderNumbers(result.rows[0])
    });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

// Create Razorpay order for a specific AgriFlow order
export const createRazorpayOrder = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ error: 'Only buyers can initiate payments' });
    }

    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay is not configured on server' });
    }

    const { id: orderId } = req.params;
    const buyerId = req.user.id;

    const orderResult = await pool.query(
      `SELECT o.*, c.name AS crop_name, c.farmer_id, u.name AS farmer_name
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       LEFT JOIN users u ON c.farmer_id = u.id
       WHERE o.id = $1 AND o.buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'fully-paid') {
      return res.status(400).json({ error: 'Order is already fully paid' });
    }

    const amountInPaise = Math.round((parseFloat(order.total_amount) || 0) * 100);
    if (amountInPaise <= 0) {
      return res.status(400).json({ error: 'Invalid order amount for payment' });
    }

    const shortOrderId = orderId.replace(/-/g, '').slice(0, 14);
    const receiptId = `agri_${shortOrderId}_${Date.now().toString().slice(-6)}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        orderId,
        buyerId,
        cropName: order.crop_name || 'Crop order'
      }
    });

    const updatedResult = await pool.query(
      `UPDATE orders
       SET payment_method = $1,
           razorpay_order_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      ['razorpay', razorpayOrder.id, orderId]
    );

    await createPaymentAuditEntry({
      orderId,
      actorId: buyerId,
      action: 'buyer_payment_initiated',
      note: `Razorpay order ${razorpayOrder.id} created`,
      previousState: {
        payment_status: order.payment_status,
        paid_to_farmer: order.paid_to_farmer || false
      },
      nextState: {
        payment_status: updatedResult.rows[0].payment_status,
        razorpay_order_id: updatedResult.rows[0].razorpay_order_id
      }
    });

    res.json({
      success: true,
      message: 'Razorpay order created successfully',
      paymentOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        keyId: RAZORPAY_KEY_ID
      },
      order: mapOrderNumbers(updatedResult.rows[0])
    });
  } catch (err) {
    console.error('Create Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create payment order', details: err.message });
  }
};

// Verify Razorpay payment signature and mark order as paid
export const verifyRazorpayPayment = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ error: 'Only buyers can verify payments' });
    }

    if (!RAZORPAY_KEY_SECRET || !razorpay) {
      return res.status(500).json({ error: 'Razorpay is not configured on server' });
    }

    const { id: orderId } = req.params;
    const buyerId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'fully-paid') {
      return res.json({
        success: true,
        message: 'Order payment already verified',
        order: mapOrderNumbers(order)
      });
    }

    if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Razorpay order mismatch' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ error: `Payment status is ${payment.status}, not successful` });
    }

    const updateResult = await pool.query(
      `UPDATE orders
       SET payment_status = 'fully-paid',
           advance_amount = total_amount,
           payment_method = 'razorpay',
           razorpay_order_id = $1,
           razorpay_payment_id = $2,
           razorpay_signature = $3,
           paid_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId]
    );

    await createPaymentAuditEntry({
      orderId,
      actorId: buyerId,
      action: 'buyer_payment_verified',
      note: `Payment ${razorpay_payment_id} verified successfully`,
      previousState: {
        payment_status: order.payment_status,
        paid_to_farmer: order.paid_to_farmer || false
      },
      nextState: {
        payment_status: updateResult.rows[0].payment_status,
        paid_at: updateResult.rows[0].paid_at,
        paid_to_farmer: updateResult.rows[0].paid_to_farmer || false
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: mapOrderNumbers(updateResult.rows[0])
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment', details: err.message });
  }
};

// Get payment status for an order
export const getOrderPaymentStatus = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const result = await pool.query(
      `SELECT o.id, o.buyer_id, o.crop_id, o.status, o.payment_status, o.total_amount,
              o.advance_amount, o.payment_method, o.razorpay_order_id, o.razorpay_payment_id,
              o.paid_at, o.paid_to_farmer, o.farmer_paid_at, o.farmer_paid_by,
              c.farmer_id
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];
    const hasAccess =
      role === 'admin' ||
      order.buyer_id === userId ||
      order.farmer_id === userId;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      payment: {
        orderId: order.id,
        paymentStatus: order.payment_status,
        totalAmount: parseFloat(order.total_amount) || 0,
        paidAmount: parseFloat(order.advance_amount) || 0,
        paymentMethod: order.payment_method,
        razorpayOrderId: order.razorpay_order_id,
        razorpayPaymentId: order.razorpay_payment_id,
        paidAt: order.paid_at,
        paidToFarmer: order.paid_to_farmer || false,
        farmerPaidAt: order.farmer_paid_at,
        farmerPaidBy: order.farmer_paid_by,
        paid: order.payment_status === 'fully-paid'
      }
    });
  } catch (err) {
    console.error('Get payment status error:', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
};

// Admin marks that farmer has been settled for a paid order
export const settleFarmerPayment = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const adminId = req.user.id;
    const { note } = req.body || {};

    const orderResult = await pool.query(
      `SELECT o.*, c.farmer_id, c.name AS crop_name,
              u_f.name AS farmer_name, u_b.name AS buyer_name
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       LEFT JOIN users u_f ON c.farmer_id = u_f.id
       LEFT JOIN users u_b ON o.buyer_id = u_b.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== 'fully-paid') {
      return res.status(400).json({ error: 'Buyer payment is not fully completed for this order' });
    }

    if (order.paid_to_farmer) {
      return res.status(400).json({ error: 'This order is already marked as settled to farmer' });
    }

    const settlementNote = note || 'Farmer settlement completed by admin';

    const updateResult = await pool.query(
      `UPDATE orders
       SET paid_to_farmer = true,
           farmer_paid_at = CURRENT_TIMESTAMP,
           farmer_paid_by = $1,
           settlement_note = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [adminId, settlementNote, orderId]
    );

    await createPaymentAuditEntry({
      orderId,
      actorId: adminId,
      action: 'farmer_settlement_completed',
      note: settlementNote,
      previousState: {
        payment_status: order.payment_status,
        paid_to_farmer: order.paid_to_farmer || false
      },
      nextState: {
        payment_status: updateResult.rows[0].payment_status,
        paid_to_farmer: updateResult.rows[0].paid_to_farmer || false,
        farmer_paid_at: updateResult.rows[0].farmer_paid_at
      }
    });

    res.json({
      success: true,
      message: `Farmer settlement marked for order ${orderId}`,
      order: mapOrderNumbers(updateResult.rows[0])
    });
  } catch (err) {
    console.error('Settle farmer payment error:', err);
    res.status(500).json({ error: 'Failed to mark farmer settlement' });
  }
};

// Admin/farmer payment history timeline with audit trail
export const getPaymentHistory = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { orderId } = req.query;

    if (!['admin', 'farmer'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const values = [];
    const conditions = [];

    if (role === 'farmer') {
      values.push(userId);
      conditions.push(`c.farmer_id = $${values.length}`);
    }

    if (orderId) {
      values.push(orderId);
      conditions.push(`pal.order_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit);
    const limitParam = `$${values.length}`;

    const result = await pool.query(
      `SELECT pal.id, pal.order_id, pal.action, pal.note, pal.created_at,
              pal.previous_state, pal.next_state,
              actor.name AS actor_name, actor.role AS actor_role,
              o.total_amount, o.payment_status, o.paid_to_farmer, o.paid_at, o.farmer_paid_at,
              c.name AS crop_name,
              buyer.name AS buyer_name,
              farmer.name AS farmer_name
       FROM payment_audit_logs pal
       JOIN orders o ON o.id = pal.order_id
       JOIN crops c ON c.id = o.crop_id
       LEFT JOIN users actor ON actor.id = pal.actor_id
       LEFT JOIN users buyer ON buyer.id = o.buyer_id
       LEFT JOIN users farmer ON farmer.id = c.farmer_id
       ${whereClause}
       ORDER BY pal.created_at DESC
       LIMIT ${limitParam}`,
      values
    );

    const history = result.rows.map((entry) => ({
      ...entry,
      total_amount: parseFloat(entry.total_amount) || 0,
      paid_to_farmer: entry.paid_to_farmer || false
    }));

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
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
      order: mapOrderNumbers(result.rows[0])
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
