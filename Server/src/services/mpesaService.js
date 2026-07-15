const axios = require('axios');
const { DateTime } = require('luxon');

class MpesaError extends Error {
  constructor(message, safaricomResponse) {
    super(message);
    this.name = 'MpesaError';
    this.safaricomResponse = safaricomResponse;
  }
}

class MpesaService {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    if (!this.config.consumerKey || !this.config.consumerSecret) {
      throw new MpesaError('M-Pesa consumer credentials are not configured');
    }

    const auth = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    try {
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      );

      const token = response.data?.access_token;
      if (!token) {
        throw new MpesaError('Failed to acquire M-Pesa access token', response.data);
      }
      return token;
    } catch (err) {
      const safaricomData = err.response?.data;
      const message = safaricomData?.errorMessage || safaricomData?.error_description || err.message || 'Failed to get M-Pesa access token';
      throw new MpesaError(message, safaricomData);
    }
  }

  generatePassword() {
    const timestamp = DateTime.now()
      .setZone('Africa/Nairobi')
      .toFormat('yyyyMMddHHmmss');

    const password = Buffer.from(
      `${this.config.shortcode}${this.config.passkey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  formatPhone(raw) {
    let phone = String(raw || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (/^[17]/.test(phone)) phone = '254' + phone;
    return phone;
  }

  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const formattedPhone = this.formatPhone(phoneNumber);

    const payload = {
      BusinessShortCode: this.config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(Number(amount) || 0),
      PartyA: formattedPhone,
      PartyB: this.config.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.config.callbackUrl,
      AccountReference: String(accountReference || '').slice(0, 12),
      TransactionDesc: String(transactionDesc || accountReference || 'Payment').slice(0, 13)
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (err) {
      const safaricomData = err.response?.data;
      throw new MpesaError(
        safaricomData?.errorMessage || safaricomData?.ResultDesc || err.message || 'STK push failed',
        safaricomData
      );
    }
  }
}

const mpesaService = new MpesaService({
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortcode: process.env.MPESA_SHORTCODE || '',
  passkey: process.env.MPESA_PASSKEY || '',
  callbackUrl: process.env.MPESA_CALLBACK_URL || '',
  environment: process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
});

module.exports = {
  MpesaService,
  MpesaError,
  mpesaService
};
