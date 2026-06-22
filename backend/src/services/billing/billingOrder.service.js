import prisma from '../../utils/db.js';

/**
 * Service responsible for managing the PaymentOrder lifecycle.
 */
export class BillingOrderService {
  
  /**
   * Initialize a new PaymentOrder
   */
  async createOrder({ schoolId, planPricingId, purpose, amount, currency, provider = 'DUMMY', metadata = {} }) {
    // Basic validation
    if (!schoolId || !planPricingId || !amount || !currency) {
      throw new Error('Missing required fields for PaymentOrder');
    }

    const order = await prisma.paymentOrder.create({
      data: {
        schoolId,
        planPricingId,
        purpose,
        amount,
        currency,
        provider,
        status: 'CREATED',
        metadata,
        // Optional: Set expiry, e.g., 24 hours from now
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    return order;
  }

  /**
   * Update order status to AWAITING_PAYMENT (typically after provider intent is created)
   */
  async markAwaitingPayment(orderId, providerOrderId) {
    return await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { 
        status: 'AWAITING_PAYMENT',
        providerOrderId
      }
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    
    // Check state machine
    if (['PAID', 'CANCELLED', 'EXPIRED'].includes(order.status)) {
      throw new Error(`Cannot cancel order in status ${order.status}`);
    }

    return await prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    });
  }

  /**
   * Fetch an order by ID
   */
  async getOrder(orderId) {
    return await prisma.paymentOrder.findUnique({ 
      where: { id: orderId },
      include: {
        planPricing: {
          include: { plan: true }
        },
        transactions: true
      }
    });
  }
}

export default new BillingOrderService();
