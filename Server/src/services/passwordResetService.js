"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePasswordResetTable = ensurePasswordResetTable;
exports.createPasswordResetToken = createPasswordResetToken;
exports.hashResetToken = hashResetToken;
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
const RESET_TTL_MINUTES = 60;
function getBaseUrl() {
    return (process.env.CLIENT_BASE_URL ||
        process.env.FRONTEND_URL ||
        "http://127.0.0.1:5500/client").replace(/\/$/, "");
}
async function ensurePasswordResetTable() {
    await index_1.pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await index_1.pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens (user_id)
  `);
}
async function createPasswordResetToken(userId) {
    const rawToken = crypto_1.default.randomBytes(32).toString("hex");
    const tokenHash = crypto_1.default.createHash("sha256").update(rawToken).digest("hex");
    await index_1.pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
    await index_1.pool.query(`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)`, [tokenHash, userId, RESET_TTL_MINUTES]);
    return {
        rawToken,
        resetUrl: `${getBaseUrl()}/reset-password.html?token=${rawToken}`,
        expiresInMinutes: RESET_TTL_MINUTES,
    };
}
function hashResetToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
