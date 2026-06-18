import { PaymentProvider } from '../paymentProvider.interface.js';
import { v4 as uuidv4 } from 'uuid';

export class DummyProvider extends PaymentProvider {
  async createPaymentIntent(order) {
    // Generate a fake provider order ID
    const dummyProviderOrderId = `dummy_order_${uuidv4()}`;
    return {
      provider: 'DUMMY',
      providerOrderId: dummyProviderOrderId,
      clientSecret: `secret_${uuidv4()}`
    };
  }

  async verifyPayment(payload) {
    // The dummy provider assumes the payload contains the simulation result
    const { paymentOrderId, amount, currency, result } = payload;
    
    return {
      paymentOrderId,
      provider: 'DUMMY',
      providerPaymentId: `dummy_pay_${uuidv4()}`,
      amount: parseFloat(amount),
      currency: currency,
      status: result === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      rawPayload: payload
    };
  }

  async processWebhook(payload, signature) {
    // For simulation purposes, processWebhook just routes through verifyPayment
    return this.verifyPayment(payload);
  }
}

export default new DummyProvider();
