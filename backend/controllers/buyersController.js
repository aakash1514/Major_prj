import pool from '../db.js';

// Get buyer profile
export const getBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const userResult = await pool.query(
      'SELECT id, name, email, role, location, contact_number, profile_image, kyc FROM users WHERE id = $1',
      [buyerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    const buyerResult = await pool.query(
      'SELECT * FROM buyers WHERE id = $1',
      [buyerId]
    );

    res.json({
      ...userResult.rows[0],
      buyerDetails: buyerResult.rows[0] || {}
    });
  } catch (err) {
    console.error('Get buyer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update buyer profile
export const updateBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { name, location, contactNumber, profileImage, companyName, businessType, preferences } = req.body;

    console.log('📝 Updating buyer profile for:', buyerId);
    console.log('📦 Received data:', { name, location, contactNumber, profileImage, companyName, businessType, preferences });

    // Update user info with COALESCE(NULLIF(..., ''), existing_value) to handle empty strings
    await pool.query(
      'UPDATE users SET name = COALESCE(NULLIF($1, \'\'), name), location = COALESCE(NULLIF($2, \'\'), location), contact_number = COALESCE(NULLIF($3, \'\'), contact_number), profile_image = COALESCE(NULLIF($4, \'\'), profile_image) WHERE id = $5',
      [name, location, contactNumber, profileImage, buyerId]
    );

    console.log('✅ Users table updated');

    // Update buyer info
    await pool.query(
      `UPDATE buyers SET 
        company_name = COALESCE(NULLIF($1, ''), company_name),
        business_type = COALESCE(NULLIF($2, ''), business_type),
        preferences = COALESCE(NULLIF($3, ''), preferences)
      WHERE id = $4`,
      [companyName, businessType, preferences, buyerId]
    );

    console.log('✅ Buyers table updated');

    const result = await pool.query(
      'SELECT id, name, email, role, location, contact_number, profile_image, kyc FROM users WHERE id = $1',
      [buyerId]
    );

    console.log('✅ Profile fetch result:', result.rows[0]);

    res.json({
      message: 'Buyer profile updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update buyer profile error:', err);
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
};

// Get buyer's orders
export const getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC',
      [buyerId]
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
    console.error('Get buyer orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get buyer dashboard stats
export const getBuyerDashboardStats = async (req, res) => {
  try {
    const buyerId = req.user.id;

    // Get total orders count
    const totalOrdersResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM orders WHERE buyer_id = $1',
      [buyerId]
    );

    // Get available crops in marketplace (listed crops)
    const availableCropsResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM crops WHERE status = $1',
      ['listed']
    );

    // Get pending delivery orders
    const pendingDeliveryResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM orders WHERE buyer_id = $1 AND status != $2',
      [buyerId, 'delivered']
    );

    // Get total spent (sum of all order amounts for this buyer)
    const totalSpentResult = await pool.query(
      'SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)::NUMERIC as total FROM orders WHERE buyer_id = $1',
      [buyerId]
    );

    // Get recent orders (last 5)
    const recentOrdersResult = await pool.query(
      `SELECT o.id, o.status, o.created_at, o.total_amount, c.name as crop_name, u.name as farmer_name
       FROM orders o
       LEFT JOIN crops c ON o.crop_id = c.id
       LEFT JOIN users u ON c.farmer_id = u.id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [buyerId]
    );

    // Get featured crops (listed crops, limit 6)
    const featuredCropsResult = await pool.query(
      `SELECT id, name, status, created_at, farmer_id, price
       FROM crops
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      ['listed']
    );

    // Get order status breakdown for this buyer
    const orderStatusBreakdownResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM orders WHERE buyer_id = $1 GROUP BY status`,
      [buyerId]
    );
    const orderStatusBreakdown = {};
    orderStatusBreakdownResult.rows?.forEach(row => {
      orderStatusBreakdown[row.status] = row.count;
    });

    const totalOrders = totalOrdersResult.rows[0]?.count || 0;
    const availableCrops = availableCropsResult.rows[0]?.count || 0;
    const pendingDelivery = pendingDeliveryResult.rows[0]?.count || 0;
    const totalSpent = parseFloat(totalSpentResult.rows[0]?.total || 0);

    res.json({
      totalOrders,
      availableCrops,
      pendingDelivery,
      totalSpent,
      orderStatusBreakdown,
      recentOrders: recentOrdersResult.rows || [],
      featuredCrops: featuredCropsResult.rows || []
    });
  } catch (err) {
    console.error('Get buyer dashboard stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats',
      totalOrders: 0,
      availableCrops: 0,
      pendingDelivery: 0,
      totalSpent: 0,
      orderStatusBreakdown: {},
      recentOrders: [],
      featuredCrops: []
    });
  }
};
