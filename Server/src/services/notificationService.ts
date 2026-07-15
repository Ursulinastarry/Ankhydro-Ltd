import axios from "axios";
import { pool } from "../db";

export type NotificationType =
  | "ACCOUNT"
  | "ORDER"
  | "PAYMENT"
  | "PASSWORD_RESET"
  | "GENERAL";

export type NotifyPayload = {
  userId?: string;
  audience?: "ADMIN";
  title: string;
  message: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
  sendEmail?: boolean;
  emailTo?: string;
};

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let cachedAccessToken: string | undefined;
let tokenExpiry = 0;
let cachedAccountId: string | undefined;

function getZohoAccountsBaseUrl(): string {
  return (process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.com").replace(/\/+$/, "");
}

function getZohoMailBaseUrl(): string {
  return (process.env.ZOHO_MAIL_BASE_URL || "https://mail.zoho.com").replace(/\/+$/, "");
}

function resetZohoCache() {
  cachedAccessToken = undefined;
  tokenExpiry = 0;
  cachedAccountId = undefined;
}

function getAxiosErrorDetails(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
  };
}

export async function ensureNotificationsTable(): Promise<void> {
  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC)
  `);
}

async function refreshAccessToken(): Promise<string> {
  const response = await axios.post(
    `${getZohoAccountsBaseUrl()}/oauth/v2/token`,
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    }
  );

  const accessToken = String(response.data.access_token || "");
  const expiresIn = Number(response.data.expires_in || 3600);

  if (!accessToken) {
    throw new Error("Zoho did not return an access token");
  }

  cachedAccessToken = accessToken;
  tokenExpiry = Date.now() + Math.max(expiresIn - 300, 60) * 1000;
  return accessToken;
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  if (!process.env.ZOHO_REFRESH_TOKEN || !process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho OAuth environment variables are missing");
  }

  return refreshAccessToken();
}

async function getZohoAccountId(): Promise<string> {
  if (process.env.ZOHO_ACCOUNT_ID?.trim()) {
    return process.env.ZOHO_ACCOUNT_ID.trim();
  }

  if (cachedAccountId) {
    return cachedAccountId;
  }

  const accessToken = await getAccessToken();
  const response = await axios.get(`${getZohoMailBaseUrl()}/api/accounts`, {
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

export async function sendZohoEmail({ to, subject, text, html }: SendEmailArgs) {
  if (!process.env.ZOHO_EMAIL) {
    console.warn("ZOHO_EMAIL is not configured. Email not sent.");
    return { delivered: false, provider: "log" as const };
  }

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const accessToken = await getAccessToken();
        const accountId = await getZohoAccountId();

        await axios.post(
          `${getZohoMailBaseUrl()}/api/accounts/${accountId}/messages`,
          {
            fromAddress: process.env.ZOHO_EMAIL,
            toAddress: to,
            subject,
            content: html,
            mailFormat: "html",
            askReceipt: "no",
          },
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        return { delivered: true, provider: "zoho" as const };
      } catch (error) {
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
  } catch (error) {
    console.error("Zoho email send failed:", error);
    const details = getAxiosErrorDetails(error);
    if (details) {
      console.error("Zoho response details:", details);
    }
    console.info(`Email fallback for ${to}: ${subject}\n${text}`);
    return { delivered: false, provider: "log" as const };
  }
}

function buildNotificationEmail(title: string, message: string, data?: Record<string, unknown>) {
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

export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  const html = buildNotificationEmail(title, message, data);
  const text = [title, "", message, data ? JSON.stringify(data, null, 2) : ""].filter(Boolean).join("\n");
  return sendZohoEmail({ to, subject: title, text, html });
}

export async function createAndSendNotification(payload: NotifyPayload) {
  const {
    userId,
    audience,
    title,
    message,
    type = "GENERAL",
    data,
    sendEmail = false,
    emailTo,
  } = payload;

  if (audience === "ADMIN") {
    const { rows: admins } = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE is_admin = TRUE`
    );

    const created = [];

    for (const admin of admins) {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { rows } = await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING *`,
        [id, admin.id, type, title, message, data ? JSON.stringify(data) : null]
      );
      created.push(rows[0]);
    }

    if (sendEmail) {
      if (emailTo) {
        await sendNotificationEmail(emailTo, title, message, data);
      } else {
        await Promise.all(
          admins.map((admin: { id: string; email: string }) =>
            sendNotificationEmail(admin.email, title, message, data)
          )
        );
      }
  }
}

  if (!userId) {
    throw new Error("Notification must include either userId or audience");
  }

  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, message, data, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE)
     RETURNING *`,
    [id, userId, type, title, message, data ? JSON.stringify(data) : null]
  );

  if (sendEmail && emailTo) {
    await sendNotificationEmail(emailTo, title, message, data);
  }

  return rows[0];
}
  
