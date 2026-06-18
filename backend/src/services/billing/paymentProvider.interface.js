/**
 * VerifiedPaymentEvent Interface Definition
 * This is the ONLY payload the billing domain understands.
 * 
 * {
 *   paymentOrderId: string,
 *   provider: string,
 *   providerPaymentId: string,
 *   amount: number, // Decimal format
 *   currency: string,
 *   status: 'SUCCESS' | 'FAILED',
 *   rawPayload: object
 * }
 */

export class PaymentProvider {
  /**
   * Initialize a payment intent with the provider.
   * @param {Object} order - The internal PaymentOrder record
   * @returns {Promise<Object>} Provider-specific initialization data (e.g., client secret, provider order ID)
   */
  async createPaymentIntent(order) {
    throw new Error('createPaymentIntent must be implemented by concrete provider');
  }

  /**
   * Synchronously verify a payment (e.g., after user returns to frontend).
   * @param {Object} payload - Data returned from the client side verification
   * @returns {Promise<VerifiedPaymentEvent>}
   */
  async verifyPayment(payload) {
    throw new Error('verifyPayment must be implemented by concrete provider');
  }

  /**
   * Process asynchronous webhook from the provider.
   * @param {Object} payload - Webhook body
   * @param {String} signature - Webhook signature
   * @returns {Promise<VerifiedPaymentEvent>}
   */
  async processWebhook(payload, signature) {
    throw new Error('processWebhook must be implemented by concrete provider');
  }
}
