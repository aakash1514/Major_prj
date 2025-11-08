import pool from '../db.js';

// Get all crops
export const getAllCrops = async (req, res) => {
  try {
    console.log('📥 Fetching all crops for admin...');
    const result = await pool.query(
      'SELECT * FROM crops ORDER BY created_at DESC'
    );
    console.log('✅ Found', result.rows.length, 'crops');
    // Convert price from string to number
    const crops = result.rows.map(crop => ({
      ...crop,
      price: parseFloat(crop.price) || 0,
      quantity: parseInt(crop.quantity) || 0
    }));
    res.json(crops);
  } catch (err) {
    console.error('❌ Get crops error:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

// Get crop by ID
export const getCropById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM crops WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    const crop = result.rows[0];
    res.json({
      ...crop,
      price: parseFloat(crop.price) || 0,
      quantity: parseInt(crop.quantity) || 0
    });
  } catch (err) {
    console.error('Get crop error:', err);
    res.status(500).json({ error: 'Failed to fetch crop' });
  }
};

// Create new crop (farmer only)
export const createCrop = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { name, quantity, unit, harvest_date, description, images, tac, price } = req.body;

    console.log('📝 Received crop data:', {
      farmerId,
      name,
      quantity,
      unit,
      harvest_date,
      description,
      images,
      tac,
      price
    });

    // Validate required fields
    if (!name || !quantity || !unit) {
      return res.status(400).json({ error: 'Missing required fields: name, quantity, unit' });
    }

    const result = await pool.query(
      'INSERT INTO crops (farmer_id, name, quantity, unit, harvest_date, description, images, tac, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [farmerId, name, Number(quantity), unit, harvest_date || new Date(), description || '', images || [], tac || '', price || 0, 'pending']
    );

    console.log('✅ Crop created:', result.rows[0]);

    res.status(201).json({
      message: 'Crop created successfully',
      crop: {
        ...result.rows[0],
        price: parseFloat(result.rows[0].price) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Create crop error:', err);
    res.status(500).json({ error: 'Failed to create crop: ' + err.message });
  }
};

// Update crop
export const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, unit, description, images, price, tac } = req.body;

    const result = await pool.query(
      'UPDATE crops SET name = COALESCE($1, name), quantity = COALESCE($2, quantity), unit = COALESCE($3, unit), description = COALESCE($4, description), images = COALESCE($5, images), price = COALESCE($6, price), tac = COALESCE($7, tac), updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, quantity, unit, description, images, price, tac, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({
      message: 'Crop updated successfully',
      crop: {
        ...result.rows[0],
        price: parseFloat(result.rows[0].price) || 0,
        quantity: parseInt(result.rows[0].quantity) || 0
      }
    });
  } catch (err) {
    console.error('Update crop error:', err);
    res.status(500).json({ error: 'Failed to update crop' });
  }
};

// Delete crop
export const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM crops WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    console.error('Delete crop error:', err);
    res.status(500).json({ error: 'Failed to delete crop' });
  }
};

// Get crops by farmer
export const getCropsByFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
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
