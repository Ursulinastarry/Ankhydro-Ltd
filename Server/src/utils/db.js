const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';
const pool = new Pool({
  connectionString,
  ssl: connectionString && (process.env.NODE_ENV === 'production' || process.env.PGSSLMODE === 'require')
    ? { rejectUnauthorized: false }
    : false
});

async function queryRows(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function initDb() {
  if (!connectionString) {
    console.warn('DATABASE_URL is not configured. Database initialization skipped.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT,
      message TEXT,
      status TEXT DEFAULT 'Unread',
      notes TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      service TEXT,
      package TEXT,
      description TEXT,
      contact_method TEXT,
      status TEXT DEFAULT 'New',
      notes TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      company TEXT,
      tagline TEXT,
      phone TEXT,
      email TEXT,
      whatsapp TEXT,
      address TEXT,
      hours TEXT,
      facebook TEXT,
      instagram TEXT,
      tiktok TEXT,
      linkedin TEXT,
      youtube TEXT,
      twitter TEXT,
      ga TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_stats (
      id SERIAL PRIMARY KEY,
      boreholes INTEGER DEFAULT 0,
      solar INTEGER DEFAULT 0,
      clients INTEGER DEFAULT 0,
      counties INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT,
      description TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      price_label TEXT,
      category TEXT,
      specs TEXT,
      status TEXT DEFAULT 'inactive',
      featured BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT,
      service TEXT,
      description TEXT,
      date DATE,
      status TEXT DEFAULT 'draft',
      image TEXT,
      image2 TEXT,
      client TEXT,
      testimonial TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT,
      author TEXT,
      excerpt TEXT,
      content TEXT,
      date DATE,
      status TEXT DEFAULT 'draft',
      image TEXT,
      tags TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      client TEXT NOT NULL,
      location TEXT,
      service TEXT,
      rating INTEGER DEFAULT 5,
      text TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      bio TEXT,
      status TEXT DEFAULT 'inactive',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS faq_items (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      icon TEXT,
      user_email TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_uploads (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      section TEXT,
      item_id TEXT,
      url TEXT,
      mime_type TEXT,
      size INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mpesa_orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT,
      customer_email TEXT,
      phone TEXT,
      service TEXT,
      package_name TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'KES',
      status TEXT DEFAULT 'pending',
      account_reference TEXT,
      transaction_desc TEXT,
      checkout_request_id TEXT,
      merchant_request_id TEXT,
      receipt_number TEXT,
      transaction_id TEXT,
      result_code INTEGER,
      result_desc TEXT,
      callback_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at TIMESTAMPTZ
    )
  `);
}

module.exports = {
  pool,
  queryRows,
  queryOne,
  initDb
};
