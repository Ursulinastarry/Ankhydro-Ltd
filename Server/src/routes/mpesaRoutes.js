const express = require('express');
const { mpesaService, MpesaError } = require('../services/mpesaService');
const { pool, queryOne } = require('../db');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

function normalizeMpesaPayload(body) {
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
    packageName
  } = req.body;

  if (!phone || !amount || !accountReference) {
    return res.status(400).json({ error: 'phone, amount and accountReference are required.' });
  }

  let orderResult = null;
  try {
    orderResult = await pool.query(
      `INSERT INTO mpesa_orders (customer_name, customer_email, phone, service, package_name, amount, account_reference, transaction_desc, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [
        customerName || null,
        customerEmail || null,
        phone,
        service || null,
        packageName || null,
        Math.ceil(Number(amount) || 0),
        accountReference,
        transactionDesc || null
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
  } catch (error) {
    const message = error.message || 'M-Pesa request failed';
    console.error('[M-Pesa] Pay failed:', error instanceof MpesaError ? error.safaricomResponse : message);
    if (orderResult?.rows?.[0]?.id) {
      const orderId = orderResult.rows[0].id;
      const errorDesc = error instanceof MpesaError ? error.safaricomResponse?.ResponseDescription || error.safaricomResponse?.errorMessage || message : message;
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
  const receiptNumber = (items.find(item => item.Name === 'MpesaReceiptNumber') || {}).Value ||
    (items.find(item => item.name === 'MpesaReceiptNumber') || {}).Value || null;

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
        result_desc: resultDesc
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[M-Pesa] Callback processing failed:', error.message || error);
    res.status(500).json({ error: 'Failed to process M-Pesa callback.' });
  }
});

module.exports = router;
