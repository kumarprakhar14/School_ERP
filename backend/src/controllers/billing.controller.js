import prisma from '../utils/db.js';
import billingOrderService from '../services/billing/billingOrder.service.js';
import paymentProcessingService from '../services/billing/paymentProcessing.service.js';
import dummyProvider from '../services/billing/providers/dummyProvider.js';

export const createOrder = async (req, res) => {
  try {
    const { schoolId, planPricingId, purpose } = req.body;

    // Verify school and pricing exist
    const planPricing = await prisma.planPricing.findUnique({
      where: { id: planPricingId }
    });
    if (!planPricing) {
      return res.status(404).json({ error: 'Plan pricing not found' });
    }

    const order = await billingOrderService.createOrder({
      schoolId,
      planPricingId,
      purpose: purpose || 'SUBSCRIPTION_PURCHASE',
      amount: planPricing.price,
      currency: planPricing.currency,
      provider: 'DUMMY'
    });

    // Generate Intent with Dummy Provider
    const intent = await dummyProvider.createPaymentIntent(order);
    
    // Update order
    const updatedOrder = await billingOrderService.markAwaitingPayment(order.id, intent.providerOrderId);

    res.status(201).json({ order: updatedOrder, intent });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(400).json({ error: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await billingOrderService.cancelOrder(id);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const simulatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body; // 'SUCCESS' or 'FAILED'

    const order = await billingOrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 1. Send the simulation payload to DummyProvider
    // It transforms it into the VerifiedPaymentEvent contract
    const verifiedEvent = await dummyProvider.verifyPayment({
      paymentOrderId: order.id,
      amount: parseFloat(order.amount.toString()),
      currency: order.currency,
      result: result || 'SUCCESS'
    });

    // 2. Billing service orchestrates the rest
    const processResult = await paymentProcessingService.processVerifiedPayment(verifiedEvent);

    res.json({ success: true, verifiedEvent, processResult });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.paymentOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        school: true,
        planPricing: { include: { plan: true } },
        transactions: true
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getSchoolOrders = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Ensure school admins can only fetch their own
    if (req.user.role !== 'SUPER_ADMIN' && req.user.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Unauthorized access to school orders' });
    }

    const orders = await prisma.paymentOrder.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        planPricing: { include: { plan: true } },
        transactions: true
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch school orders' });
  }
};

export default {
  createOrder,
  cancelOrder,
  simulatePayment,
  getAllOrders,
  getSchoolOrders
};
