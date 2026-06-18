import prisma from '../../utils/db.js';

/**
 * Service responsible for processing VerifiedPaymentEvents.
 * This acts as the secure boundary between the external gateway payload and internal business logic.
 */
export class PaymentProcessingService {
  
  /**
   * Process a normalized VerifiedPaymentEvent from a provider.
   * @param {Object} event - The VerifiedPaymentEvent
   */
  async processVerifiedPayment(event) {
    const { paymentOrderId, provider, providerPaymentId, amount, currency, status, rawPayload } = event;

    // 1. Fetch the original order
    const order = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        planPricing: {
          include: { plan: true }
        }
      }
    });

    if (!order) {
      throw new Error(`PaymentOrder not found: ${paymentOrderId}`);
    }

    // 2. State Machine Check (Idempotency)
    if (order.status === 'PAID') {
      console.warn(`PaymentOrder ${paymentOrderId} is already PAID. Ignoring duplicate event.`);
      return { status: 'IGNORED', reason: 'ALREADY_PAID' };
    }
    
    if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(order.status)) {
      throw new Error(`Cannot process payment for order in terminal state: ${order.status}`);
    }

    // 3. Strict Validation
    // The amount in the database is a Decimal, so we convert it to a float for comparison
    const orderAmount = parseFloat(order.amount.toString());
    const eventAmount = parseFloat(amount.toString());

    if (orderAmount !== eventAmount) {
      throw new Error(`Amount mismatch. Order: ${orderAmount}, Verified: ${eventAmount}`);
    }

    if (order.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new Error(`Currency mismatch. Order: ${order.currency}, Verified: ${currency}`);
    }

    // 4. Process based on verified status
    if (status === 'FAILED') {
      await this._handleFailedPayment(order, event);
      return { status: 'FAILED_RECORDED' };
    }

    if (status === 'SUCCESS') {
      // 5. Execute Business Action (Atomically)
      return await this._handleSuccessfulPayment(order, event);
    }

    throw new Error(`Unknown VerifiedPaymentEvent status: ${status}`);
  }

  async _handleFailedPayment(order, event) {
    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      }),
      prisma.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          provider: event.provider,
          providerPaymentId: event.providerPaymentId,
          amount: event.amount,
          currency: event.currency,
          status: 'FAILED',
          rawPayload: event.rawPayload || {}
        }
      })
    ]);
  }

  async _handleSuccessfulPayment(order, event) {
    // We must atomically:
    // a. Mark order PAID
    // b. Create Transaction
    // c. Close old subscription (if any)
    // d. Create new active subscription
    // e. Link the new subscription to the Transaction
    
    return await prisma.$transaction(async (tx) => {
      // Lock the order (if postgres supports it, but simple check is okay here)
      const currentOrder = await tx.paymentOrder.findUnique({ where: { id: order.id } });
      if (currentOrder.status === 'PAID') {
        return { status: 'IGNORED', reason: 'ALREADY_PAID' };
      }

      // Find currently active subscription to expire
      const activeSub = await tx.schoolSubscription.findFirst({
        where: {
          schoolId: order.schoolId,
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      const now = new Date();
      let expiresAt = null;

      // Calculate new expiry based on plan interval if applicable
      // e.g. Monthly = +1 month, Yearly = +1 year
      if (order.planPricing.interval === 'MONTHLY') {
        expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (order.planPricing.interval === 'YEARLY') {
        expiresAt = new Date(now);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      if (activeSub) {
        await tx.schoolSubscription.update({
          where: { id: activeSub.id },
          data: {
            expiresAt: now,
            status: activeSub.startsAt > now ? 'CANCELLED' : 'EXPIRED'
          }
        });
      }

      // Create new subscription
      const newSub = await tx.schoolSubscription.create({
        data: {
          schoolId: order.schoolId,
          planId: order.planPricing.planId,
          planPricingId: order.planPricingId,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt,
          notes: `Activated via PaymentOrder ${order.id}`,
        }
      });

      // Mark order as PAID
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'PAID' }
      });

      // Create the transaction record
      const transaction = await tx.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          activatedSubscriptionId: newSub.id,
          provider: event.provider,
          providerPaymentId: event.providerPaymentId,
          amount: event.amount,
          currency: event.currency,
          status: 'SUCCESS',
          rawPayload: event.rawPayload || {},
          paidAt: now
        }
      });

      return {
        status: 'SUCCESS',
        transactionId: transaction.id,
        subscriptionId: newSub.id
      };
    });
  }
}

export default new PaymentProcessingService();
