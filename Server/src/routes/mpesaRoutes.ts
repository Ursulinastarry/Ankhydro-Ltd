import express from 'express';
import { mpesaService, MpesaError } from '../services/mpesaService.js';
import { sendEmail } from '../services/emailService.js';
import { pool, queryOne } from '../db.js';

const router = express.Router();

type MpesaPayload = Record<string, any>;

function normalizeMpesaPayload(body: any): MpesaPayload {
  return body?.Body?.stkCallback || body?.stkCallback || body;
}

router.post('/pay', async (req, res) => {
  const {
    phone,
    amount,
    accountReference,
    transactionDesc,
    customerName,
    customerEmail,
    service,
    packageName,
    deliveryAddress,
  } = req.body as Record<string, any>;

  if (!phone || !amount || !accountReference) {
    return res.status(400).json({ error: 'phone, amount and accountReference are required.' });
  }

  let orderResult: any = null;
  try {
    orderResult = await pool.query(
      `INSERT INTO mpesa_orders (customer_name, customer_email, phone, service, package_name, amount, account_reference, transaction_desc, delivery_address, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
      [
        customerName || null,
        customerEmail || null,
        phone,
        service || null,
        packageName || null,
        Math.ceil(Number(amount) || 0),
        accountReference,
        transactionDesc || null,
        deliveryAddress || null,
      ]
    );

    const order = orderResult.rows[0];
    const mpesaResponse = await mpesaService.initiateSTKPush(
      phone,
      order.amount,
      order.account_reference,
      order.transaction_desc || order.account_reference
    );

    await pool.query(
      `UPDATE mpesa_orders SET checkout_request_id=$1, merchant_request_id=$2 WHERE id=$3`,
      [mpesaResponse.CheckoutRequestID || null, mpesaResponse.MerchantRequestID || null, order.id]
    );

    res.json({ success: true, order: { id: order.id, status: order.status }, mpesa: mpesaResponse });
  } catch (error: any) {
    const message = error.message || 'M-Pesa request failed';
    console.error('[M-Pesa] Pay failed:', error instanceof MpesaError ? error.safaricomResponse : message);
    if (orderResult?.rows?.[0]?.id) {
      const orderId = orderResult.rows[0].id;
      const errorDesc = error instanceof MpesaError
        ? error.safaricomResponse?.ResponseDescription || error.safaricomResponse?.errorMessage || message
        : message;
      await pool.query(`UPDATE mpesa_orders SET status='failed', result_desc=$1 WHERE id=$2`, [errorDesc, orderId]).catch(() => {});
    }
    res.status(500).json({ error: message, safaricom: error instanceof MpesaError ? error.safaricomResponse : null });
  }
});

router.post('/callback', async (req, res) => {
  const payload = normalizeMpesaPayload(req.body);
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid M-Pesa callback payload.' });
  }

  const resultCode = Number(payload.ResultCode ?? payload.resultCode ?? -1);
  const resultDesc = payload.ResultDesc || payload.resultDesc || '';
  const checkoutRequestId = payload.CheckoutRequestID || payload.checkoutRequestID || null;
  const merchantRequestId = payload.MerchantRequestID || payload.merchantRequestID || null;
  const items = payload.CallbackMetadata?.Item || [];
  const receiptNumber = (items.find((item: any) => item.Name === 'MpesaReceiptNumber') || {}).Value ||
    (items.find((item: any) => item.name === 'MpesaReceiptNumber') || {}).Value || null;

  try {
    const order = await queryOne(
      `SELECT * FROM mpesa_orders WHERE checkout_request_id=$1 OR merchant_request_id=$2 ORDER BY id DESC LIMIT 1`,
      [checkoutRequestId, merchantRequestId]
    );

    if (!order) {
      console.warn('[M-Pesa] Callback received but no matching order found.', checkoutRequestId, merchantRequestId);
      return res.json({ success: true });
    }

    const status = resultCode === 0 ? 'paid' : 'failed';
    const paidAt = resultCode === 0 ? new Date() : null;

    await pool.query(
      `UPDATE mpesa_orders SET status=$1, receipt_number=$2, transaction_id=$3, result_code=$4, result_desc=$5, callback_payload=$6, paid_at=$7 WHERE id=$8`,
      [status, receiptNumber, receiptNumber, resultCode, resultDesc, req.body, paidAt, order.id]
    );

    if (status === 'paid') {
      await sendEmail('payment', {
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        phone: order.phone,
        service: order.service,
        package_name: order.package_name,
        amount: order.amount,
        currency: order.currency,
        receipt_number: receiptNumber,
        result_desc: resultDesc,
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[M-Pesa] Callback processing failed:', error.message || error);
    res.status(500).json({ error: 'Failed to process M-Pesa callback.' });
  }
});

// ---------------------------------------------------------------------
// Admin dashboard endpoints — list orders from mpesa_orders and let an
// admin update an order's status by hand (e.g. reconciling a payment that
// the callback missed). These are separate from the /pay and /callback
// routes above, which are the customer-facing checkout + Safaricom webhook.
// ---------------------------------------------------------------------

router.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM mpesa_orders ORDER BY created_at DESC LIMIT 500`
    );
    res.json({ success: true, orders: result.rows });
  } catch (error: any) {
    console.error('[M-Pesa] Failed to fetch orders:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch M-Pesa orders.' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await queryOne(`SELECT * FROM mpesa_orders WHERE id=$1`, [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ success: true, order });
  } catch (error: any) {
    console.error('[M-Pesa] Failed to fetch order:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

const ALLOWED_ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled'];

router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body as Record<string, any>;
  if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_ORDER_STATUSES.join(', ')}` });
  }
  try {
    const result = await pool.query(
      `UPDATE mpesa_orders SET status=$1, paid_at = CASE WHEN $1='paid' AND paid_at IS NULL THEN now() ELSE paid_at END WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    res.json({ success: true, order: result.rows[0] });
  } catch (error: any) {
    console.error('[M-Pesa] Failed to update order status:', error.message || error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

export default router;