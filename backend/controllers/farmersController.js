import pool from '../db.js';

// Get farmer profile
export const getFarmerProfile = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const userResult = await pool.query(
      'SELECT id, name, email, role, location, contact_number, profile_image, kyc FROM users WHERE id = $1',
      [farmerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const farmerResult = await pool.query(
      'SELECT * FROM farmers WHERE id = $1',
      [farmerId]
    );

    const user = userResult.rows[0];
    const farmer = farmerResult.rows[0] || {};

    // Map database fields to frontend expected fields
    res.json({
      ...user,
      phone: user.contact_number,
      bio: farmer.farm_location,
      farm_size: farmer.farm_size,
      experience: farmer.certifications ? farmer.certifications[0] : '',
      crop_preference: farmer.crop_types ? farmer.crop_types[0] : '',
      farmerDetails: farmer
    });
  } catch (err) {
    console.error('Get farmer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update farmer profile
export const updateFarmerProfile = async (req, res) => {
  try {
    const farmerId = req.user.id;
    
    console.log('📝 Raw req.body:', JSON.stringify(req.body));
    console.log('📝 Raw req.body keys:', Object.keys(req.body));
    
    const { location, phone, bio, farm_size, experience, crop_preference } = req.body;

    console.log('📝 Extracted fields:', {
      location: `"${location}"`,
      phone: `"${phone}"`,
      bio: `"${bio}"`,
      farm_size: `"${farm_size}"`,
      experience: `"${experience}"`,
      crop_preference: `"${crop_preference}"`
    });

    // Update users table with location and phone
    const userUpdateResult = await pool.query(
      `UPDATE users 
       SET location = COALESCE(NULLIF($1, ''), location),
           contact_number = COALESCE(NULLIF($2, ''), contact_number)
       WHERE id = $3
       RETURNING *`,
      [location || null, phone || null, farmerId]
    );

    console.log('📝 User update result:', userUpdateResult.rows[0]);

    // Update farmers table with farm details
    const farmerUpdateResult = await pool.query(
      `UPDATE farmers 
       SET farm_size = COALESCE(NULLIF($1::text, '')::decimal, farm_size),
           farm_location = COALESCE(NULLIF($2, ''), farm_location),
           crop_types = CASE WHEN $3 != '' THEN ARRAY[$3] ELSE crop_types END,
           certifications = CASE WHEN $4 != '' THEN ARRAY[$4] ELSE certifications END
       WHERE id = $5
       RETURNING *`,
      [farm_size, bio, crop_preference, experience, farmerId]
    );

    console.log('📝 Farmer update result:', farmerUpdateResult.rows[0]);

    // Fetch complete updated profile
    const userResult = await pool.query(
      'SELECT id, name, email, role, location, contact_number, profile_image, kyc FROM users WHERE id = $1',
      [farmerId]
    );

    const farmerResult = await pool.query(
      'SELECT * FROM farmers WHERE id = $1',
      [farmerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const farmer = farmerResult.rows[0] || {};

    // Map database fields to frontend expected fields
    const responseData = {
      ...user,
      phone: user.contact_number,
      bio: farmer.farm_location,
      farm_size: farmer.farm_size,
      experience: farmer.certifications && farmer.certifications.length > 0 ? farmer.certifications[0] : '',
      crop_preference: farmer.crop_types && farmer.crop_types.length > 0 ? farmer.crop_types[0] : '',
      farmerDetails: farmer
    };

    console.log('📝 Final response data:', responseData);

    res.json({
      message: 'Farmer profile updated successfully',
      ...responseData
    });
  } catch (err) {
    console.error('Update farmer profile error:', err);
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
};

// Get farmer's crops
export const getFarmerCrops = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC',
      [farmerId]
    );

    // Convert price from string to number
    const crops = result.rows.map(crop => ({
      ...crop,
      price: parseFloat(crop.price) || 0,
      quantity: parseInt(crop.quantity) || 0
    }));

    res.json(crops);
  } catch (err) {
    console.error('Get farmer crops error:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

// Get farmer's orders
export const getFarmerOrders = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const result = await pool.query(
      `SELECT o.* FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE c.farmer_id = $1
       ORDER BY o.created_at DESC`,
      [farmerId]
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
    console.error('Get farmer orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get farmer dashboard stats
export const getFarmerDashboardStats = async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Get total crops count
    const totalCropsResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM crops WHERE farmer_id = $1',
      [farmerId]
    );

    // Get crop status counts
    const pendingCropsResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM crops WHERE farmer_id = $1 AND status = $2',
      [farmerId, 'pending']
    );

    const approvedCropsResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM crops WHERE farmer_id = $1 AND status IN ($2, $3)',
      [farmerId, 'approved', 'listed']
    );

    const rejectedCropsResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM crops WHERE farmer_id = $1 AND status = $2',
      [farmerId, 'rejected']
    );

    // Get total orders for farmer's crops
    const totalOrdersResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE c.farmer_id = $1`,
      [farmerId]
    );

    // Get total revenue (sum of order amounts)
    const totalRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)::NUMERIC as total 
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE c.farmer_id = $1`,
      [farmerId]
    );

    // Get recent crops (last 6)
    const recentCropsResult = await pool.query(
      `SELECT id, name, status, created_at, price, quantity, unit, description
       FROM crops
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      [farmerId]
    );

    // Get recent orders (last 5)
    const recentOrdersResult = await pool.query(
      `SELECT o.id, o.status, o.created_at, o.total_amount, o.quantity, c.name as crop_name, u.name as buyer_name
       FROM orders o
       JOIN crops c ON o.crop_id = c.id
       LEFT JOIN users u ON o.buyer_id = u.id
       WHERE c.farmer_id = $1
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [farmerId]
    );

    // Get crop status breakdown
    const cropStatusBreakdownResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM crops WHERE farmer_id = $1 GROUP BY status`,
      [farmerId]
    );
    const cropStatusBreakdown = {};
    cropStatusBreakdownResult.rows?.forEach(row => {
      cropStatusBreakdown[row.status] = row.count;
    });

    // Get order status breakdown
    const orderStatusBreakdownResult = await pool.query(
      `SELECT o.status, COUNT(*)::int as count FROM orders o
       JOIN crops c ON o.crop_id = c.id
       WHERE c.farmer_id = $1
       GROUP BY o.status`,
      [farmerId]
    );
    const orderStatusBreakdown = {};
    orderStatusBreakdownResult.rows?.forEach(row => {
      orderStatusBreakdown[row.status] = row.count;
    });

    const totalCrops = totalCropsResult.rows[0]?.count || 0;
    const pendingCrops = pendingCropsResult.rows[0]?.count || 0;
    const approvedCrops = approvedCropsResult.rows[0]?.count || 0;
    const rejectedCrops = rejectedCropsResult.rows[0]?.count || 0;
    const totalOrders = totalOrdersResult.rows[0]?.count || 0;
    const totalRevenue = parseFloat(totalRevenueResult.rows[0]?.total || 0);

    res.json({
      totalCrops,
      pendingCrops,
      approvedCrops,
      rejectedCrops,
      totalOrders,
      totalRevenue,
      cropStatusBreakdown,
      orderStatusBreakdown,
      recentCrops: recentCropsResult.rows || [],
      recentOrders: recentOrdersResult.rows || []
    });
  } catch (err) {
    console.error('Get farmer dashboard stats error:', err);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      totalCrops: 0,
      pendingCrops: 0,
      approvedCrops: 0,
      rejectedCrops: 0,
      totalOrders: 0,
      totalRevenue: 0,
      cropStatusBreakdown: {},
      orderStatusBreakdown: {},
      recentCrops: [],
      recentOrders: []
    });
  }
};
