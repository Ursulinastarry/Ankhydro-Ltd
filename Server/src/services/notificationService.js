"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureNotificationsTable = ensureNotificationsTable;
exports.sendZohoEmail = sendZohoEmail;
exports.sendNotificationEmail = sendNotificationEmail;
exports.createAndSendNotification = createAndSendNotification;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../index");
let cachedAccessToken;
let tokenExpiry = 0;
let cachedAccountId;
function getZohoAccountsBaseUrl() {
    return (process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.com").replace(/\/+$/, "");
}
function getZohoMailBaseUrl() {
    return (process.env.ZOHO_MAIL_BASE_URL || "https://mail.zoho.com").replace(/\/+$/, "");
}
function resetZohoCache() {
    cachedAccessToken = undefined;
    tokenExpiry = 0;
    cachedAccountId = undefined;
}
function getAxiosErrorDetails(error) {
    if (!axios_1.default.isAxiosError(error)) {
        return null;
    }
    return {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
    };
}
async function ensureNotificationsTable() {
    await index_1.pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'GENERAL',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await index_1.pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC)
  `);
}
async function refreshAccessToken() {
    const response = await axios_1.default.post(`${getZohoAccountsBaseUrl()}/oauth/v2/token`, null, {
        params: {
            refresh_token: process.env.ZOHO_REFRESH_TOKEN,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: "refresh_token",
        },
    });
    const accessToken = String(response.data.access_token || "");
    const expiresIn = Number(response.data.expires_in || 3600);
    if (!accessToken) {
        throw new Error("Zoho did not return an access token");
    }
    cachedAccessToken = accessToken;
    tokenExpiry = Date.now() + Math.max(expiresIn - 300, 60) * 1000;
    return accessToken;
}
async function getAccessToken() {
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }
    if (!process.env.ZOHO_REFRESH_TOKEN || !process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
        throw new Error("Zoho OAuth environment variables are missing");
    }
    return refreshAccessToken();
}
async function getZohoAccountId() {
    if (process.env.ZOHO_ACCOUNT_ID?.trim()) {
        return process.env.ZOHO_ACCOUNT_ID.trim();
    }
    if (cachedAccountId) {
        return cachedAccountId;
    }
    const accessToken = await getAccessToken();
    const response = await axios_1.default.get(`${getZohoMailBaseUrl()}/api/accounts`, {
        headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            Accept: "application/json",
        },
    });
    const accountId = response.data?.data?.[0]?.accountId;
    if (!accountId) {
        throw new Error("No Zoho Mail account was returned");
    }
    cachedAccountId = String(accountId);
    return cachedAccountId;
}
async function sendZohoEmail({ to, subject, text, html }) {
    if (!process.env.ZOHO_EMAIL) {
        console.warn("ZOHO_EMAIL is not configured. Email not sent.");
        return { delivered: false, provider: "log" };
    }
    try {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                const accessToken = await getAccessToken();
                const accountId = await getZohoAccountId();
                await axios_1.default.post(`${getZohoMailBaseUrl()}/api/accounts/${accountId}/messages`, {
                    fromAddress: process.env.ZOHO_EMAIL,
                    toAddress: to,
                    subject,
                    content: html,
                    mailFormat: "html",
                    askReceipt: "no",
                }, {
                    headers: {
                        Authorization: `Zoho-oauthtoken ${accessToken}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                });
                return { delivered: true, provider: "zoho" };
            }
            catch (error) {
                const details = getAxiosErrorDetails(error);
                const shouldRetry = attempt === 1 && details?.status === 401;
                if (shouldRetry) {
                    resetZohoCache();
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Zoho email send failed after retry");
    }
    catch (error) {
        console.error("Zoho email send failed:", error);
        const details = getAxiosErrorDetails(error);
        if (details) {
            console.error("Zoho response details:", details);
        }
        console.info(`Email fallback for ${to}: ${subject}\n${text}`);
        return { delivered: false, provider: "log" };
    }
}
function buildNotificationEmail(title, message, data) {
    const details = data
        ? `
      <div style="margin-top:20px;padding:16px;border:1px solid #e8ddd5;border-radius:12px;background:#faf7f2;">
        <div style="font-weight:600;margin-bottom:8px;">Additional details</div>
        <pre style="margin:0;white-space:pre-wrap;font-family:Consolas, monospace;font-size:12px;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `
        : "";
    return `
    <div style="font-family: Georgia, serif; color: #2c2c2c; line-height: 1.6; max-width: 620px; margin: 0 auto;">
      <h2 style="color:#215e6d;">${title}</h2>
      <p>${message}</p>
      ${details}
      <p style="margin-top:24px;color:#7a6e6a;font-size:12px;">This is an automated notification from Ming'aro.</p>
    </div>
  `;
}
async function sendNotificationEmail(to, title, message, data) {
    const html = buildNotificationEmail(title, message, data);
    const text = [title, "", message, data ? JSON.stringify(data, null, 2) : ""].filter(Boolean).join("\n");
    return sendZohoEmail({ to, subject: title, text, html });
}
async function createAndSendNotification(payload) {
    const { userId, audience, title, message, type = "GENERAL", data, sendEmail = false, emailTo, } = payload;
    if (audience === "ADMIN") {
        const { rows: admins } = await index_1.pool.query(`SELECT id, email FROM users WHERE is_admin = TRUE`);
        const created = [];
        for (const admin of admins) {
            const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const { rows } = await index_1.pool.query(`INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING *`, [id, admin.id, type, title, message, data ? JSON.stringify(data) : null]);
            created.push(rows[0]);
        }
        if (sendEmail) {
            if (emailTo) {
                await sendNotificationEmail(emailTo, title, message, data);
            }
            else {
                await Promise.all(admins.map((admin) => sendNotificationEmail(admin.email, title, message, data)));
            }
        }
        return created;
    }
    if (!userId) {
        throw new Error("Notification must include either userId or audience");
    }
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { rows } = await index_1.pool.query(`INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE)
     RETURNING *`, [id, userId, type, title, message, data ? JSON.stringify(data) : null]);
    if (sendEmail && emailTo) {
        await sendNotificationEmail(emailTo, title, message, data);
    }
    return rows[0];
}
