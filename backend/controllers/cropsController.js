import pool from '../db.js';

const CROP_SORTS = {
  newest: 'created_at DESC',
  'price-low': 'price ASC NULLS LAST, created_at DESC',
  'price-high': 'price DESC NULLS LAST, created_at DESC',
  name: 'name ASC, created_at DESC',
};

// Escape LIKE wildcards so user input matches literally
const likePattern = (value) => `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;

// Public marketplace listing: listed crops only, paginated, with optional
// ?search= (name/description), ?category= (name/tac), ?minPrice=, ?maxPrice=, ?sort=
export const getAllCrops = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const values = ['listed'];
    const conditions = ['status = $1'];

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      values.push(likePattern(search));
      conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (category && category !== 'all') {
      values.push(likePattern(category));
      conditions.push(`(name ILIKE $${values.length} OR tac ILIKE $${values.length})`);
    }

    const minPrice = parseFloat(req.query.minPrice);
    if (Number.isFinite(minPrice)) {
      values.push(minPrice);
      conditions.push(`price >= $${values.length}`);
    }

    const maxPrice = parseFloat(req.query.maxPrice);
    if (Number.isFinite(maxPrice)) {
      values.push(maxPrice);
      conditions.push(`price <= $${values.length}`);
    }

    const where = conditions.join(' AND ');
    const orderBy = CROP_SORTS[req.query.sort] || CROP_SORTS.newest;

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM crops WHERE ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM crops WHERE ${where}`, values)
    ]);

    const crops = result.rows.map(crop => ({
      ...crop,
      price: parseFloat(crop.price) || 0,
      quantity: parseInt(crop.quantity) || 0
    }));

    const total = countResult.rows[0].total;
    // Same values as `pagination`, for clients that read headers (exposed via CORS in index.js)
    res.set({ 'X-Total-Count': String(total), 'X-Page': String(page), 'X-Limit': String(limit) });

    res.json({
      crops,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
      "UPDATE crops SET name = COALESCE($1, name), quantity = COALESCE($2, quantity), unit = COALESCE($3, unit), description = COALESCE($4, description), images = COALESCE($5, images), price = COALESCE($6, price), tac = COALESCE($7, tac), status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND farmer_id = $9 AND status IN ('pending', 'rejected') RETURNING *",
      [name, quantity, unit, description, images, price, tac, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found, not yours, or no longer editable' });
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

    const result = await pool.query(
      'DELETE FROM crops WHERE id = $1 AND farmer_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crop not found or you do not have permission to modify it' });
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
