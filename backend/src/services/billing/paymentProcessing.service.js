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
    
    if (order.expiresAt && order.expiresAt < new Date()) {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
      throw new Error(`PaymentOrder ${paymentOrderId} has expired`);
    }

    if (order.status !== 'AWAITING_PAYMENT') {
      throw new Error(`Cannot process payment for order in state: ${order.status}. Only AWAITING_PAYMENT orders can be processed.`);
    }

    // 3. Strict Validation
    // The amount in the database is a Decimal, so we convert it to a float for comparison
    const orderAmount = parseFloat(order.amount.toString());
    const eventAmount = parseFloat(amount.toString());

    if (Math.abs(orderAmount - eventAmount) > 0.01) {
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
    
    try {
    return await prisma.$transaction(async (tx) => {
      // Re-check inside transaction for race safety
      const currentOrder = await tx.paymentOrder.findUnique({ where: { id: order.id } });
      if (currentOrder.status === 'PAID') {
        return { status: 'IGNORED', reason: 'ALREADY_PAID' };
      }

      const now = new Date();
      let newSubId = null;

      // Only perform subscription replacement for subscription-related purposes
      if (!['ADDON_PURCHASE', 'MANUAL_PAYMENT'].includes(order.purpose)) {
        // Find currently active subscription to expire
        const activeSub = await tx.schoolSubscription.findFirst({
          where: {
            schoolId: order.schoolId,
            status: 'ACTIVE',
            startsAt: { lte: now },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        });

        let expiresAt = null;

        // Calculate new expiry based on plan interval if applicable
        if (order.planPricing.interval === 'MONTHLY') {
          expiresAt = new Date(now);
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (order.planPricing.interval === 'QUARTERLY') {
          expiresAt = new Date(now);
          expiresAt.setMonth(expiresAt.getMonth() + 3);
        } else if (order.planPricing.interval === 'YEARLY') {
          expiresAt = new Date(now);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else if (order.planPricing.interval === 'ONCE') {
          expiresAt = null; // Lifetime
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
        newSubId = newSub.id;

        // Bridge: sync School.validUntil with subscription expiry
        await tx.school.update({
          where: { id: order.schoolId },
          data: { validUntil: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
        });
      }

      // Mark order as PAID
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'PAID' }
      });

      // Create the transaction record
      const transaction = await tx.paymentTransaction.create({
        data: {
          paymentOrderId: order.id,
          activatedSubscriptionId: newSubId,
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
        subscriptionId: newSubId
      };
    });
    } catch (error) {
      // Handle duplicate provider payment ID (concurrent webhook)
      if (error.code === 'P2002' && error.meta?.target?.includes('provider_providerPaymentId')) {
        console.warn(`Duplicate payment event detected for provider payment. Ignoring.`);
        return { status: 'IGNORED', reason: 'DUPLICATE_EVENT' };
      }
      throw error;
    }
  }
}

export default new PaymentProcessingService();
