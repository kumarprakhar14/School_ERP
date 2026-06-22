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

/**
 * Helper: Sync School.validUntil with the latest active subscription's expiresAt.
 * This bridges the legacy validUntil-based access middleware with the new subscription system.
 */
async function syncSchoolValidity(tx, schoolId, expiresAt) {
  if (expiresAt) {
    await tx.school.update({
      where: { id: schoolId },
      data: { validUntil: expiresAt }
    });
  }
}

// POST /api/subscriptions/schools/:schoolId/assign
export const assignPlan = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { planId, planPricingId, effectiveDate, notes } = req.body;
    const adminId = req.user.userId;

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

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
      if (pricing.planId !== planId) {
        return res.status(400).json({ error: 'Selected pricing does not belong to the selected plan.' });
      }
    }

    const startsAt = effectiveDate ? new Date(effectiveDate) : new Date();

    // Use a transaction to gracefully close any currently active subscription and create the new one
    const result = await prisma.$transaction(async (tx) => {
      // Find the currently active, effective subscription
      const now = new Date();
      const activeSub = await tx.schoolSubscription.findFirst({
        where: {
          schoolId,
          status: 'ACTIVE',
          startsAt: { lte: now },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      });

      if (activeSub) {
        // Expire it exactly when the new one starts
        await tx.schoolSubscription.update({
          where: { id: activeSub.id },
          data: {
            expiresAt: startsAt,
            status: startsAt > now ? 'ACTIVE' : (activeSub.startsAt > startsAt ? 'CANCELLED' : 'EXPIRED')
          }
        });
      }

      let expiresAt = null;
      if (pricing) {
        if (pricing.interval === 'MONTHLY') {
          expiresAt = new Date(startsAt);
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (pricing.interval === 'QUARTERLY') {
          expiresAt = new Date(startsAt);
          expiresAt.setMonth(expiresAt.getMonth() + 3);
        } else if (pricing.interval === 'YEARLY') {
          expiresAt = new Date(startsAt);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }
        // 'ONCE' → expiresAt stays null (lifetime)
      }

      // Create new subscription
      const newSub = await tx.schoolSubscription.create({
        data: {
          schoolId,
          planId,
          planPricingId: pricing?.id || null,
          status: 'ACTIVE',
          startsAt,
          expiresAt,
          notes,
          activatedById: adminId
        }
      });

      // Bridge: sync School.validUntil with the new subscription expiry
      await syncSchoolValidity(tx, schoolId, expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

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

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const now = new Date();
    const activeSub = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { startsAt: 'desc' }
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

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const now = new Date();
    const suspendedSub = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: 'SUSPENDED',
        // Only allow reactivation if the subscription hasn't expired
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!suspendedSub) return res.status(404).json({ error: 'No suspended subscription found (or subscription has already expired).' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: suspendedSub.id },
      data: { status: 'ACTIVE', notes: notes ? `${suspendedSub.notes || ''}\n[Reactivated]: ${notes}` : suspendedSub.notes }
    });

    // Bridge: sync validity back
    if (suspendedSub.expiresAt) {
      await prisma.school.update({ where: { id: schoolId }, data: { validUntil: suspendedSub.expiresAt } });
    }

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

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const now = new Date();
    const currentSub = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: { in: ['ACTIVE', 'SUSPENDED'] },
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { startsAt: 'desc' }
    });

    if (!currentSub) return res.status(404).json({ error: 'No cancellable subscription found.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: currentSub.id },
      data: { 
        status: 'CANCELLED', 
        expiresAt: now, 
        notes: notes ? `${currentSub.notes || ''}\n[Cancelled]: ${notes}` : currentSub.notes 
      }
    });

    // Bridge: when cancelling, set validUntil to now to revoke access immediately
    await prisma.school.update({ where: { id: schoolId }, data: { validUntil: now } });

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

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const now = new Date();
    const parsedExpiry = new Date(newExpiryDate);

    if (parsedExpiry <= now) {
      return res.status(400).json({ error: 'New expiry date must be in the future.' });
    }

    const activeSub = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { startsAt: 'desc' }
    });

    if (!activeSub) return res.status(404).json({ error: 'No active subscription found to extend.' });

    const updated = await prisma.schoolSubscription.update({
      where: { id: activeSub.id },
      data: { 
        expiresAt: parsedExpiry, 
        notes: notes ? `${activeSub.notes || ''}\n[Extended]: ${notes}` : activeSub.notes 
      }
    });

    // Bridge: sync School.validUntil
    await prisma.school.update({ where: { id: schoolId }, data: { validUntil: parsedExpiry } });

    res.json(updated);
  } catch (error) {
    console.error('Failed to extend subscription:', error);
    res.status(500).json({ error: 'Failed to extend subscription' });
  }
};

