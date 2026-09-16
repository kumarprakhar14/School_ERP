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
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || req.query.q !== undefined || req.query.search !== undefined || req.query.status !== undefined;
    if (hasPagination) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const q = (req.query.q || req.query.search || '').trim();
      const status = req.query.status || null;
      const where = {};
      if (status) where.status = status;
      if (q) {
        where.OR = [
          { providerOrderId: { contains: q, mode: 'insensitive' } },
          { school: { name: { contains: q, mode: 'insensitive' } } },
          { school: { code: { contains: q, mode: 'insensitive' } } },
        ];
      }
      const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
      const [orders, total] = await Promise.all([
        prisma.paymentOrder.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { school: { select: { id: true, name: true, code: true } }, planPricing: { include: { plan: true } }, transactions: true } }),
        prisma.paymentOrder.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const orders = await prisma.paymentOrder.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: {
        school: { select: { id: true, name: true, code: true } },
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

    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || req.query.q !== undefined || req.query.search !== undefined || req.query.status !== undefined;
    if (hasPagination) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const q = (req.query.q || req.query.search || '').trim();
      const status = req.query.status || null;
      const where = { schoolId };
      if (status) where.status = status;
      if (q) {
        where.OR = [
          { providerOrderId: { contains: q, mode: 'insensitive' } },
        ];
      }
      const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
      const [orders, total] = await Promise.all([
        prisma.paymentOrder.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { planPricing: { include: { plan: true } }, transactions: true } }),
        prisma.paymentOrder.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const orders = await prisma.paymentOrder.findMany({
      where: { schoolId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
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
