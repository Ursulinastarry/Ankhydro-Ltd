import axios from 'axios';
import { DateTime } from 'luxon';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

// A structured error that carries the raw Safaricom response
// so the controller can surface it directly to the client
export class MpesaError extends Error {
  public readonly safaricomResponse: any;

  constructor(message: string, safaricomResponse?: any) {
    super(message);
    this.name = 'MpesaError';
    this.safaricomResponse = safaricomResponse;
  }
}

export class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke'
        : 'https://api.safaricom.co.ke';
  }

  // ── OAuth token ────────────────────────────────────────────────────
  private async getAccessToken(): Promise<string> {
    if (!this.config.consumerKey || !this.config.consumerSecret) {
      throw new MpesaError('M-Pesa consumer key/secret not configured');
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
        throw new MpesaError('Access token missing in Safaricom response', response.data);
      }

      return token;
    } catch (err: any) {
      // Re-throw MpesaErrors as-is
      if (err instanceof MpesaError) throw err;

      const safaricomData = err.response?.data;
      const msg =
        safaricomData?.errorMessage ||
        safaricomData?.error_description ||
        err.message ||
        'Failed to get M-Pesa access token';

      console.error('[M-Pesa] getAccessToken failed:', safaricomData || err.message);
      throw new MpesaError(msg, safaricomData);
    }
  }

  // ── Password ───────────────────────────────────────────────────────
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = DateTime.now()
      .setZone('Africa/Nairobi')
      .toFormat('yyyyMMddHHmmss');

    const password = Buffer.from(
      `${this.config.shortcode}${this.config.passkey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  // ── Format phone ───────────────────────────────────────────────────
  private formatPhone(raw: string): string {
    let phone = raw.replace(/\D/g, '');               // strip non-digits
    if (phone.startsWith('0'))  phone = '254' + phone.slice(1);
    if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;
    return phone;
  }

  // ── STK Push ───────────────────────────────────────────────────────
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string
  ) {
    const token                   = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const formattedPhone          = this.formatPhone(phoneNumber);

    const payload = {
      BusinessShortCode: this.config.shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            Math.ceil(amount),   // M-Pesa requires whole numbers
      PartyA:            formattedPhone,
      PartyB:            this.config.shortcode,
      PhoneNumber:       formattedPhone,
      CallBackURL:       this.config.callbackUrl,
      AccountReference:  accountReference.slice(0, 12),  // max 12 chars
      TransactionDesc:   transactionDesc.slice(0, 13),   // max 13 chars
    };

    // console.log('[M-Pesa] STK push payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // console.log('[M-Pesa] STK push response:', JSON.stringify(response.data, null, 2));
      return response.data;

    } catch (err: any) {
      const safaricomData = err.response?.data;

      // Log the full Safaricom error so it's visible in Railway logs
      console.error(
        '[M-Pesa] STK push failed.\nSafaricom response:',
        JSON.stringify(safaricomData, null, 2),
        '\nPayload sent:',
        JSON.stringify(payload, null, 2)
      );

      const msg =
        safaricomData?.errorMessage ||
        safaricomData?.ResultDesc   ||
        safaricomData?.error        ||
        err.message                 ||
        'STK push failed';

      throw new MpesaError(msg, safaricomData);
    }
  }

  // ── Query STK status ───────────────────────────────────────────────
  async querySTKPushStatus(checkoutRequestId: string) {
    const token                   = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.config.shortcode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (err: any) {
      const safaricomData = err.response?.data;
      console.error('[M-Pesa] Query failed:', JSON.stringify(safaricomData, null, 2));

      const msg =
        safaricomData?.errorMessage ||
        err.message                 ||
        'STK push query failed';

      throw new MpesaError(msg, safaricomData);
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const mpesaService = new MpesaService({
  consumerKey:  process.env.MPESA_CONSUMER_KEY    || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortcode:    process.env.MPESA_SHORTCODE        || '',
  passkey:      process.env.MPESA_PASSKEY          || '',
  callbackUrl:  process.env.MPESA_CALLBACK_URL     || '',
  environment:  (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
});