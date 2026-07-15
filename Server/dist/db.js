import { Pool } from 'pg';
const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';
export const pool = new Pool({
    connectionString,
    ssl: connectionString && (process.env.NODE_ENV === 'production' || process.env.PGSSLMODE === 'require')
        ? { rejectUnauthorized: false }
        : false,
});
export async function queryRows(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}
export async function queryOne(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
}
export async function initDb() {
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
}
