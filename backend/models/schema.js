import pool from '../db.js';

/**
 * Create all required tables
 */
export const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('farmer', 'buyer', 'admin', 'agent')),
        location VARCHAR(255),
        contact_number VARCHAR(20),
        profile_image VARCHAR(500),
        kyc BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to users table if they don't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS address VARCHAR(500),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bio TEXT
    `);

    // Farmers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        farm_size DECIMAL(10, 2),
        farm_location VARCHAR(255),
        crop_types TEXT[],
        certifications TEXT[],
        years_of_experience INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Buyers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buyers (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        business_type VARCHAR(100),
        preferences TEXT[],
        purchase_history TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crops table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        harvest_date TIMESTAMP,
        description TEXT,
        images TEXT[],
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'inspected', 'approved', 'rejected', 'listed', 'sold')),
        price DECIMAL(12, 2),
        tac TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quality Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quality_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        weight DECIMAL(10, 2),
        size VARCHAR(100),
        condition VARCHAR(255),
        images TEXT[],
        notes TEXT,
        recommendation VARCHAR(50) CHECK (recommendation IN ('approve', 'reject')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'assigned', 'in-transit', 'delivered')),
        payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'advance-paid', 'fully-paid')),
        payment_method VARCHAR(50),
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        razorpay_signature TEXT,
        paid_at TIMESTAMP,
        paid_to_farmer BOOLEAN DEFAULT false,
        farmer_paid_at TIMESTAMP,
        farmer_paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
        settlement_note TEXT,
        advance_amount DECIMAL(12, 2),
        total_amount DECIMAL(12, 2) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        transporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add payment tracking columns for existing installations
    await pool.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS paid_to_farmer BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS farmer_paid_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS farmer_paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS settlement_note TEXT
    `);

    // Payment audit table for traceability (buyer payment and farmer settlement actions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        note TEXT,
        previous_state JSONB,
        next_state JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_order_id
      ON payment_audit_logs(order_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at
      ON payment_audit_logs(created_at DESC)
    `);

    // Transport Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'loaded', 'in-transit', 'delivered')),
        pickup_date TIMESTAMP,
        delivery_date TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Marketplace Listings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
        price DECIMAL(12, 2) NOT NULL,
        availability DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'unavailable')),
        listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database initialized successfully');
  } catch (err) {
    console.error('✗ Database initialization error:', err);
    throw err;
  }
};

export default pool;
