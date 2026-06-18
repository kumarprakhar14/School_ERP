import prisma from '../utils/db.js';

// GET /api/subscriptions/schools/:schoolId
export const getSchoolSubscriptions = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const subscriptions = await prisma.schoolSubscription.findMany({
      where: { schoolId },
      include: {
        plan: true,
        planPricing: true,
        activatedBy: {
          select: { id: true, name: true, erpId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('Failed to get school subscriptions:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription history' });
  }
};

// POST /api/subscriptions/schools/:schoolId/assign
export const assignPlan = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { planId, planPricingId, effectiveDate, notes } = req.body;
    const adminId = req.user.id;

    // Validate plan and pricing
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive plan selected.' });
    }

    let pricing = null;
    if (planPricingId) {
      pricing = await prisma.planPricing.findUnique({ where: { id: planPricingId } });
      if (!pricing || !pricing.isActive) {
        return res.status(400).json({ error: 'Invalid or inactive pricing selected.' });
      }
    }

    const startsAt = effectiveDate ? new Date(effectiveDate) : new Date();

    // Use a transaction to gracefully close any currently active subscription and create the new one
    const result = await prisma.$transaction(async (tx) => {
      // Find the currently active subscription
      const activeSub = await tx.schoolSubscription.findFirst({
        where: {
          schoolId,
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (activeSub) {
        // Expire it exactly when the new one starts
        await tx.schoolSubscription.update({
          where: { id: activeSub.id },
          data: {
            expiresAt: startsAt,
            status: activeSub.startsAt > startsAt ? 'CANCELLED' : 'EXPIRED' // If old sub hasn't even started, just cancel it
          }
        });
      }

      // Create new subscription
      const newSub = await tx.schoolSubscription.create({
        data: {
          schoolId,
          planId,
          planPricingId: pricing?.id || null,
          status: 'ACTIVE',
          startsAt,
          notes,
          activatedById: adminId
        }
      });

      return newSub;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Failed to assign plan:', error);
    res.status(500).json({ error: 'Failed to assign plan' });
  }
};

// POST /api/subscriptions/schools/:schoolId/suspend
export const suspendSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { notes } = req.body;

    const activeSub = await prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeSub) return res.status(404).json({ error: 'No active subscription found to suspend.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: activeSub.id },
      data: { status: 'SUSPENDED', notes: notes ? `${activeSub.notes || ''}\n[Suspended]: ${notes}` : activeSub.notes }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to suspend subscription:', error);
    res.status(500).json({ error: 'Failed to suspend subscription' });
  }
};

// POST /api/subscriptions/schools/:schoolId/reactivate
export const reactivateSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { notes } = req.body;

    const suspendedSub = await prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'SUSPENDED' },
      orderBy: { createdAt: 'desc' }
    });

    if (!suspendedSub) return res.status(404).json({ error: 'No suspended subscription found.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: suspendedSub.id },
      data: { status: 'ACTIVE', notes: notes ? `${suspendedSub.notes || ''}\n[Reactivated]: ${notes}` : suspendedSub.notes }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to reactivate subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
};

// POST /api/subscriptions/schools/:schoolId/cancel
export const cancelSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { notes } = req.body;

    const currentSub = await prisma.schoolSubscription.findFirst({
      where: { schoolId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentSub) return res.status(404).json({ error: 'No cancellable subscription found.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: currentSub.id },
      data: { 
        status: 'CANCELLED', 
        expiresAt: new Date(), 
        notes: notes ? `${currentSub.notes || ''}\n[Cancelled]: ${notes}` : currentSub.notes 
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// POST /api/subscriptions/schools/:schoolId/extend
export const extendSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { newExpiryDate, notes } = req.body;

    if (!newExpiryDate) return res.status(400).json({ error: 'newExpiryDate is required.' });

    const activeSub = await prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeSub) return res.status(404).json({ error: 'No active subscription found to extend.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: activeSub.id },
      data: { 
        expiresAt: new Date(newExpiryDate), 
        notes: notes ? `${activeSub.notes || ''}\n[Extended]: ${notes}` : activeSub.notes 
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to extend subscription:', error);
    res.status(500).json({ error: 'Failed to extend subscription' });
  }
};
