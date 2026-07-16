import nodemailer from 'nodemailer';
function escapeHtml(value) {
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function buildEmailHtml(type, payload) {
    const rows = Object.entries(payload)
        .filter(([, value]) => value != null && value !== '')
        .map(([key, value]) => `
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:700;text-transform:capitalize;">${escapeHtml(key.replace(/_/g, ' '))}</td>
        <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(String(value))}</td>
      </tr>`)
        .join('');
    const subjectLabel = type === 'quote'
        ? 'Quote Request'
        : type === 'payment'
            ? 'Payment Notification'
            : 'Contact Message';
    return `
    <html>
      <body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
        <div style="max-width:650px;margin:0 auto;padding:20px;">
          <h2 style="color:#0a2540;">ANK Hydro ${escapeHtml(subjectLabel)}</h2>
          <table style="border-collapse:collapse;width:100%;">${rows}</table>
        </div>
      </body>
    </html>`;
}
export async function sendEmail(type, payload) {
    if (!process.env.SMTP_HOST || !process.env.EMAIL_TO) {
        return null;
    }
    const transportConfig = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
            : undefined,
        tls: {
            rejectUnauthorized: false,
        },
    };
    const transporter = nodemailer.createTransport(transportConfig);
    const subject = type === 'quote'
        ? 'New Quote Request from ANK Hydro'
        : type === 'payment'
            ? 'New Payment Received from ANK Hydro'
            : 'New Contact Message from ANK Hydro';
    return transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@ankhydro.com',
        to: process.env.EMAIL_TO,
        subject,
        html: buildEmailHtml(type, payload),
    });
}
