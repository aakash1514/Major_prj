import pool from '../db.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, location, kyc, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get all crops
export const getAllCrops = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as farmer_name FROM crops c
       JOIN users u ON c.farmer_id = u.id
       ORDER BY c.created_at DESC`
    );
    // Convert price from string to number
    const crops = result.rows.map(crop => ({
      ...crop,
      price: parseFloat(crop.price) || 0,
      quantity: parseInt(crop.quantity) || 0
    }));
    res.json(crops);
  } catch (err) {
    console.error('Get crops error:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

// Approve crop
export const approveCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    const { price } = req.body;

    const result = await pool.query(
      'UPDATE crops SET status = $1, price = COALESCE($2, price), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['approved', price, cropId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({
      message: 'Crop approved successfully',
      crop: {
        ...result.rows[0],
        price: parseFloat(result.rows[0].price) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Approve crop error:', err);
    res.status(500).json({ error: 'Failed to approve crop' });
  }
};

// Reject crop
export const rejectCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      'UPDATE crops SET status = $1, tac = COALESCE($2, tac), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['rejected', reason, cropId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({
      message: 'Crop rejected',
      crop: {
        ...result.rows[0],
        price: parseFloat(result.rows[0].price) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Reject crop error:', err);
    res.status(500).json({ error: 'Failed to reject crop' });
  }
};

// List crop on marketplace
export const listCropOnMarketplace = async (req, res) => {
  try {
    const { cropId } = req.params;
    const { price, availability } = req.body;

    console.log(`📤 Listing crop ${cropId} on marketplace with price: ${price}`);

    // Update crop status to 'listed' and use farmer's price (or update if new price provided)
    const result = await pool.query(
      'UPDATE crops SET status = $1, price = COALESCE($2, price), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['listed', price, cropId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    console.log('✅ Crop listed on marketplace successfully');
    res.status(200).json({
      message: 'Crop listed on marketplace',
      crop: {
        ...result.rows[0],
        price: parseFloat(result.rows[0].price) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('❌ List crop error:', err);
    res.status(500).json({ error: 'Failed to list crop on marketplace' });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.name as crop_name, u.name as buyer_name FROM orders o
       JOIN crops c ON o.crop_id = c.id
       JOIN users u ON o.buyer_id = u.id
       ORDER BY o.created_at DESC`
    );
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

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Get basic counts
    const countUsers = await pool.query('SELECT COUNT(*)::int as count FROM users');
    const countCrops = await pool.query('SELECT COUNT(*)::int as count FROM crops');
    const countOrders = await pool.query('SELECT COUNT(*)::int as count FROM orders');
    
    // Get crop status counts
    const pendingResult = await pool.query('SELECT COUNT(*)::int as count FROM crops WHERE status = $1', ['pending']);
    const approvedResult = await pool.query('SELECT COUNT(*)::int as count FROM crops WHERE status = $1', ['approved']);
    const rejectedResult = await pool.query('SELECT COUNT(*)::int as count FROM crops WHERE status = $1', ['rejected']);
    const listedResult = await pool.query('SELECT COUNT(*)::int as count FROM crops WHERE status = $1', ['listed']);

    // Get crop status breakdown
    const cropStatusBreakdownResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM crops GROUP BY status`
    );
    const cropStatusBreakdown = {};
    cropStatusBreakdownResult.rows?.forEach(row => {
      cropStatusBreakdown[row.status] = row.count;
    });

    // Get order status breakdown
    const orderStatusBreakdownResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM orders GROUP BY status`
    );
    const orderStatusBreakdown = {};
    orderStatusBreakdownResult.rows?.forEach(row => {
      orderStatusBreakdown[row.status] = row.count;
    });

    // Get recent crops (last 5, with farmer info)
    const recentCropsResult = await pool.query(
      `SELECT c.id, c.name, c.status, c.created_at, c.farmer_id, u.name as farmer_name
       FROM crops c
       LEFT JOIN users u ON c.farmer_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 5`
    );

    // Get recent orders (last 5, with related info)
    const recentOrdersResult = await pool.query(
      `SELECT o.id, o.status, o.created_at, c.name as crop_name, u.name as buyer_name
       FROM orders o
       LEFT JOIN crops c ON o.crop_id = c.id
       LEFT JOIN users u ON o.buyer_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    const totalUsers = countUsers.rows[0]?.count || 0;
    const totalCrops = countCrops.rows[0]?.count || 0;
    const totalOrders = countOrders.rows[0]?.count || 0;
    const pendingCrops = pendingResult.rows[0]?.count || 0;
    const approvedCrops = approvedResult.rows[0]?.count || 0;
    const rejectedCrops = rejectedResult.rows[0]?.count || 0;

    res.json({
      totalUsers,
      totalCrops,
      totalOrders,
      pendingCrops,
      approvedCrops,
      rejectedCrops,
      cropStatusBreakdown,
      orderStatusBreakdown,
      userRoleBreakdown: {},
      recentCrops: recentCropsResult.rows || [],
      recentOrders: recentOrdersResult.rows || []
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      totalUsers: 0,
      totalCrops: 0,
      totalOrders: 0,
      pendingCrops: 0,
      approvedCrops: 0,
      rejectedCrops: 0,
      cropStatusBreakdown: {},
      orderStatusBreakdown: {},
      userRoleBreakdown: {},
      recentCrops: [],
      recentOrders: []
    });
  }
};

// Toggle user KYC status
export const toggleUserKyc = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET kyc = NOT COALESCE(kyc, false)
       WHERE id = $1
       RETURNING id, name, email, role, location, kyc, created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User KYC status updated successfully',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Toggle user KYC error:', err);
    res.status(500).json({ error: 'Failed to toggle user KYC status' });
  }
};

// Assign transporter to order
export const assignTransporterToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transporterId } = req.body;

    if (!transporterId) {
      return res.status(400).json({ error: 'transporterId is required' });
    }

    const result = await pool.query(
      `UPDATE orders
       SET transporter_id = $1,
           status = CASE
             WHEN status IN ('pending', 'confirmed') THEN 'assigned'
             ELSE status
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [transporterId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = {
      ...result.rows[0],
      total_amount: parseFloat(result.rows[0].total_amount) || 0,
      advance_amount: parseFloat(result.rows[0].advance_amount) || 0,
      quantity: parseInt(result.rows[0].quantity, 10) || 0,
    };

    res.json({
      message: 'Transporter assigned successfully',
      order,
    });
  } catch (err) {
    console.error('Assign transporter error:', err);
    res.status(500).json({ error: 'Failed to assign transporter' });
  }
};
