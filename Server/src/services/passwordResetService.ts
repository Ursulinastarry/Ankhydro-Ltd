import crypto from "crypto";
import { pool } from "../index";

const RESET_TTL_MINUTES = 60;

function getBaseUrl() {
  return (
    process.env.CLIENT_BASE_URL ||
    process.env.FRONTEND_URL ||
    "http://127.0.0.1:5500/client"
  ).replace(/\/$/, "");
}

export async function ensurePasswordResetTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens (user_id)
  `);
}

export async function createPasswordResetToken(userId: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)`,
    [tokenHash, userId, RESET_TTL_MINUTES]
  );

  return {
    rawToken,
    resetUrl: `${getBaseUrl()}/reset-password.html?token=${rawToken}`,
    expiresInMinutes: RESET_TTL_MINUTES,
  };
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
