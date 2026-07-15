"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
exports.sendSalesOrderAlertEmail = sendSalesOrderAlertEmail;
exports.sendDeliveredThankYouEmail = sendDeliveredThankYouEmail;
exports.sendDeliveredInvoiceEmail = sendDeliveredInvoiceEmail;
exports.sendConciergeSubmissionEmail = sendConciergeSubmissionEmail;
exports.sendConciergeClientConfirmation = sendConciergeClientConfirmation;
exports.sendOrderShippedEmail = sendOrderShippedEmail;
exports.sendSalesReviewAlertEmail = sendSalesReviewAlertEmail;
const notificationService_1 = require("./notificationService");
async function sendPasswordResetEmail(args) {
    const { email, firstName, resetUrl, expiresInMinutes } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const subject = "Reset your Ming'aro password";
    const text = [
        greeting,
        "",
        "We received a request to reset your Ming'aro password.",
        `Use this link within ${expiresInMinutes} minutes:`,
        resetUrl,
        "",
        "If you did not request this, you can ignore this email.",
    ].join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>We received a request to reset your Ming'aro password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#215e6d;color:#ffffff;text-decoration:none;border-radius:999px;">
          Reset Password
        </a>
      </p>
      <p>This link expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
async function sendWelcomeEmail(args) {
    const { email, firstName } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const subject = "Welcome to Ming'aro";
    const text = [
        greeting,
        "",
        "Welcome to Ming'aro.",
        "Your account has been created successfully and you can now explore, save your wishlist, and place orders with ease.",
        "",
        "We are glad to have you with us.",
    ].join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Welcome to <strong>Ming'aro</strong>.</p>
      <p>Your account has been created successfully and you can now explore, save your wishlist, and place orders with ease.</p>
      <p>We are glad to have you with us.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
async function sendOrderConfirmationEmail(args) {
    const { email, firstName, orderId, currency, totalAmount, items } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const subject = `Your Ming'aro order ${orderId} is confirmed`;
    const itemLines = items.map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        const variantText = variant ? ` (${variant})` : "";
        return `- ${item.name}${variantText} x${item.quantity} — ${currency} ${item.lineTotal.toFixed(2)}`;
    });
    const text = [
        greeting,
        "",
        `Your order ${orderId} has been confirmed.`,
        "",
        ...itemLines,
        "",
        `Total: ${currency} ${totalAmount.toFixed(2)}`,
        "",
        "Thank you for shopping with Ming'aro.",
    ].join("\n");
    const itemsHtml = items
        .map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;">
            <div style="font-weight:600;">${item.name}</div>
            ${variant ? `<div style="font-size:13px;color:#7a6e6a;">${variant}</div>` : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:right;">${currency} ${item.lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
        .join("");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Your order <strong>${orderId}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:10px;border-bottom:2px solid #215e6d;">Item</th>
            <th style="text-align:center;padding-bottom:10px;border-bottom:2px solid #215e6d;">Qty</th>
            <th style="text-align:right;padding-bottom:10px;border-bottom:2px solid #215e6d;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total:</strong> ${currency} ${totalAmount.toFixed(2)}</p>
      <p>Thank you for shopping with Ming'aro.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
async function sendSalesOrderAlertEmail(args) {
    const { email, orderId, currency, totalAmount, customerName, customerEmail, items } = args;
    const subject = `New confirmed order ${orderId}`;
    const customerLabel = customerName?.trim() || customerEmail?.trim() || "Customer details unavailable";
    const itemLines = items.map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        const variantText = variant ? ` (${variant})` : "";
        return `- ${item.name}${variantText} x${item.quantity} - ${currency} ${item.lineTotal.toFixed(2)}`;
    });
    const text = [
        "A new Ming'aro order has been confirmed.",
        "",
        `Order ID: ${orderId}`,
        `Customer: ${customerLabel}`,
        customerEmail ? `Customer email: ${customerEmail}` : "",
        "",
        ...itemLines,
        "",
        `Total: ${currency} ${totalAmount.toFixed(2)}`,
        "",
        "Please review the order in the admin dashboard and ship it when ready.",
    ].filter(Boolean).join("\n");
    const itemsHtml = items
        .map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;">
            <div style="font-weight:600;">${item.name}</div>
            ${variant ? `<div style="font-size:13px;color:#7a6e6a;">${variant}</div>` : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:right;">${currency} ${item.lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
        .join("");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>A new Ming'aro order has been confirmed.</p>
      <p><strong>Order ID:</strong> ${orderId}<br/><strong>Customer:</strong> ${customerLabel}${customerEmail ? `<br/><strong>Email:</strong> ${customerEmail}` : ""}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:10px;border-bottom:2px solid #215e6d;">Item</th>
            <th style="text-align:center;padding-bottom:10px;border-bottom:2px solid #215e6d;">Qty</th>
            <th style="text-align:right;padding-bottom:10px;border-bottom:2px solid #215e6d;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total:</strong> ${currency} ${totalAmount.toFixed(2)}</p>
      <p>Please review the order in the admin dashboard and ship it when ready.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
async function sendDeliveredThankYouEmail(args) {
    const { email, firstName, orderId } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const subject = `Your Ming'aro order ${orderId} was delivered`;
    const text = [
        greeting,
        "",
        `Your order ${orderId} has been marked as delivered.`,
        "Thank you for shopping with Ming'aro.",
        "We would love to hear how your experience was. Please rate us and share your feedback.",
    ].join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Your order <strong>${orderId}</strong> has been marked as delivered.</p>
      <p>Thank you for shopping with Ming'aro.</p>
      <p>We would love to hear how your experience was. Please rate us and share your feedback.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
function formatMoney(currency, amount) {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
}
function formatInvoiceDate(value) {
    if (!value)
        return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Not available";
    return date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
async function sendDeliveredInvoiceEmail(args) {
    const { email, firstName, orderId, currency, subtotal, discountAmount, taxAmount, shippingAmount, totalAmount, placedAt, deliveredAt, items, } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const invoiceNumber = `MNG-${orderId.slice(0, 8).toUpperCase()}`;
    const subject = `Invoice ${invoiceNumber} for your delivered Ming'aro order`;
    const itemLines = items.map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        const variantText = variant ? ` (${variant})` : "";
        return `- ${item.name}${variantText} x${item.quantity}: ${formatMoney(currency, item.lineTotal)}`;
    });
    const text = [
        greeting,
        "",
        `Your order ${orderId} has been marked as delivered. Thank you for shopping with Ming'aro.`,
        "",
        `Invoice: ${invoiceNumber}`,
        `Order date: ${formatInvoiceDate(placedAt)}`,
        `Delivery date: ${formatInvoiceDate(deliveredAt)}`,
        "",
        ...itemLines,
        "",
        `Subtotal: ${formatMoney(currency, subtotal)}`,
        `Discount: ${formatMoney(currency, discountAmount)}`,
        `Tax: ${formatMoney(currency, taxAmount)}`,
        `Shipping: ${formatMoney(currency, shippingAmount)}`,
        `Total paid: ${formatMoney(currency, totalAmount)}`,
        "",
        "We would love to hear how your experience was. Please rate us and share your feedback.",
    ].join("\n");
    const itemsHtml = items
        .map((item) => {
        const variant = [item.color, item.size].filter(Boolean).join(" / ");
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;">
            <div style="font-weight:600;">${item.name}</div>
            ${variant ? `<div style="font-size:13px;color:#7a6e6a;">${variant}</div>` : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:right;">${formatMoney(currency, item.unitPrice)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e8ddd5;text-align:right;">${formatMoney(currency, item.lineTotal)}</td>
        </tr>
      `;
    })
        .join("");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 680px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Your order <strong>${orderId}</strong> has been marked as delivered. Thank you for shopping with <strong>Ming'aro</strong>.</p>
      <div style="border:1px solid #e8ddd5;padding:22px;margin:22px 0;background:#fefcf8;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#7a6e6a;">Invoice</p>
        <h2 style="margin:0 0 12px;color:#215e6d;">${invoiceNumber}</h2>
        <p style="margin:0;color:#7a6e6a;">
          Order date: ${formatInvoiceDate(placedAt)}<br/>
          Delivery date: ${formatInvoiceDate(deliveredAt)}
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:10px;border-bottom:2px solid #215e6d;">Item</th>
            <th style="text-align:center;padding-bottom:10px;border-bottom:2px solid #215e6d;">Qty</th>
            <th style="text-align:right;padding-bottom:10px;border-bottom:2px solid #215e6d;">Unit</th>
            <th style="text-align:right;padding-bottom:10px;border-bottom:2px solid #215e6d;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-left:auto;max-width:280px;">
        <p style="display:flex;justify-content:space-between;margin:6px 0;"><span>Subtotal</span><strong>${formatMoney(currency, subtotal)}</strong></p>
        <p style="display:flex;justify-content:space-between;margin:6px 0;"><span>Discount</span><strong>${formatMoney(currency, discountAmount)}</strong></p>
        <p style="display:flex;justify-content:space-between;margin:6px 0;"><span>Tax</span><strong>${formatMoney(currency, taxAmount)}</strong></p>
        <p style="display:flex;justify-content:space-between;margin:6px 0;"><span>Shipping</span><strong>${formatMoney(currency, shippingAmount)}</strong></p>
        <p style="display:flex;justify-content:space-between;margin:12px 0 0;padding-top:12px;border-top:2px solid #215e6d;font-size:18px;"><span>Total paid</span><strong>${formatMoney(currency, totalAmount)}</strong></p>
      </div>
      <p style="margin-top:24px;">We would love to hear how your experience was. Please rate us and share your feedback.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
function formatDetailValue(value) {
    if (Array.isArray(value))
        return value.filter(Boolean).join(", ") || "Not provided";
    return value?.trim() || "Not provided";
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
async function sendConciergeSubmissionEmail(args) {
    const { service, fullName, email, phone, whatsapp } = args;
    const subject = `New Ming'aro Concierge request: ${service}`;
    const text = [
        "A new Ming'aro Concierge request has been submitted.",
        "",
        `Service: ${service}`,
        `Client: ${fullName}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : "",
        whatsapp ? `WhatsApp: ${whatsapp}` : "",
        "",
        "Please open the admin dashboard to view the full submitted profile.",
    ].filter(Boolean).join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 680px; margin: 0 auto;">
      <p>A new <strong>Ming'aro Concierge</strong> request has been submitted.</p>
      <p>
        <strong>Service:</strong> ${service}<br/>
        <strong>Client:</strong> ${escapeHtml(fullName)}<br/>
        <strong>Email:</strong> ${escapeHtml(email)}
        ${phone ? `<br/><strong>Phone:</strong> ${escapeHtml(phone)}` : ""}
        ${whatsapp ? `<br/><strong>WhatsApp:</strong> ${escapeHtml(whatsapp)}` : ""}
      </p>
      <p>Please open the admin dashboard to view the full submitted profile.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: process.env.CONCIERGE_EMAIL || "sales@mingaroafrica.com",
        subject,
        text,
        html,
    });
}
async function sendConciergeClientConfirmation(args) {
    const firstName = args.fullName.trim().split(/\s+/)[0];
    const greeting = firstName ? `Hi ${firstName},` : "Hi,";
    const subject = `We received your Ming'aro Concierge request`;
    const serviceLine = args.service === "Get Styled"
        ? "Our stylists are curating your looks. We will share options shortly."
        : "We are reviewing your brief and will match you with a suitable tailor shortly.";
    const text = [
        greeting,
        "",
        serviceLine,
        "",
        "Thank you for choosing Ming'aro Concierge.",
    ].join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${escapeHtml(greeting)}</p>
      <p>${serviceLine}</p>
      <p>Thank you for choosing <strong>Ming'aro Concierge</strong>.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: args.email,
        subject,
        text,
        html,
    });
}
async function sendOrderShippedEmail(args) {
    const { email, firstName, orderId, estimatedDeliveryLabel } = args;
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi,";
    const subject = `Your Ming'aro order ${orderId} is on the way`;
    const text = [
        greeting,
        "",
        `Your order ${orderId} has now been shipped.`,
        `Estimated delivery: ${estimatedDeliveryLabel}.`,
        "",
        "Thank you for shopping with Ming'aro.",
    ].join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Your order <strong>${orderId}</strong> has now been shipped.</p>
      <p><strong>Estimated delivery:</strong> ${estimatedDeliveryLabel}.</p>
      <p>Thank you for shopping with Ming'aro.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
async function sendSalesReviewAlertEmail(args) {
    const { email, productName, reviewerName, reviewerEmail, rating, title, body, reviewUrl, } = args;
    const subject = `New product review submitted for ${productName}`;
    const reviewerLabel = reviewerName?.trim() || reviewerEmail?.trim() || "Customer details unavailable";
    const text = [
        "A new Ming'aro product review is waiting for approval.",
        "",
        `Product: ${productName}`,
        `Reviewer: ${reviewerLabel}`,
        reviewerEmail ? `Reviewer email: ${reviewerEmail}` : "",
        `Rating: ${rating}/5`,
        title ? `Title: ${title}` : "",
        body ? `Review: ${body}` : "",
        reviewUrl ? `Review image: ${reviewUrl}` : "",
        "",
        "Please review it in the admin dashboard.",
    ].filter(Boolean).join("\n");
    const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2c2c2c; max-width: 620px; margin: 0 auto;">
      <p>A new Ming'aro product review is waiting for approval.</p>
      <p>
        <strong>Product:</strong> ${productName}<br/>
        <strong>Reviewer:</strong> ${reviewerLabel}
        ${reviewerEmail ? `<br/><strong>Email:</strong> ${reviewerEmail}` : ""}
        <br/><strong>Rating:</strong> ${rating}/5
      </p>
      ${title ? `<p><strong>Title:</strong> ${title}</p>` : ""}
      ${body ? `<p><strong>Review:</strong><br/>${body}</p>` : ""}
      ${reviewUrl ? `<p><a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#215e6d;color:#ffffff;text-decoration:none;border-radius:999px;">Open review image</a></p>` : ""}
      <p>Please review it in the admin dashboard.</p>
    </div>
  `;
    return (0, notificationService_1.sendZohoEmail)({
        to: email,
        subject,
        text,
        html,
    });
}
