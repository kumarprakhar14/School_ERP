import prisma from '../utils/db.js';

export const getPlanFeatures = async (req, res) => {
  try {
    const { planId } = req.params;
    const planFeatures = await prisma.planFeature.findMany({
      where: { planId },
      include: {
        feature: true
      }
    });
    res.json(planFeatures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plan features' });
  }
};

export const createPlanFeature = async (req, res) => {
  try {
    const { planId, featureId, isEnabled, limitValue, limitUnit, metadata } = req.body;
    const planFeature = await prisma.planFeature.create({
      data: { planId, featureId, isEnabled, limitValue: limitValue ? parseInt(limitValue, 10) : null, limitUnit, metadata },
      include: { feature: true }
    });
    res.status(201).json(planFeature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to map feature to plan' });
  }
};

export const updatePlanFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled, limitValue, limitUnit, metadata } = req.body;
    const planFeature = await prisma.planFeature.update({
      where: { id },
      data: { isEnabled, limitValue: limitValue ? parseInt(limitValue, 10) : null, limitUnit, metadata },
      include: { feature: true }
    });
    res.json(planFeature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update plan feature' });
  }
};

export const deletePlanFeature = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.planFeature.delete({ where: { id } });
    res.json({ message: 'Plan feature mapping deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete plan feature mapping' });
  }
};
