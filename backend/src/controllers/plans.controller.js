import prisma from '../utils/db.js';

export const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        pricing: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

export const createPlan = async (req, res) => {
  try {
    const { name, description, badge, isDefault, isPublic, isActive, displayOrder } = req.body;
    const plan = await prisma.subscriptionPlan.create({
      data: { name, description, badge, isDefault, isPublic, isActive, displayOrder },
      include: { pricing: true }
    });
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, badge, isDefault, isPublic, isActive, displayOrder } = req.body;
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { name, description, badge, isDefault, isPublic, isActive, displayOrder },
      include: { pricing: true }
    });
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.subscriptionPlan.delete({ where: { id } });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
};

export const addPricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { interval, price, currency, isActive } = req.body;
    const pricing = await prisma.planPricing.create({
      data: {
        planId: id,
        interval,
        price: parseFloat(price),
        currency,
        isActive
      }
    });
    res.status(201).json(pricing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add pricing' });
  }
};

export const updatePricing = async (req, res) => {
  try {
    const { pricingId } = req.params;
    const { interval, price, currency, isActive } = req.body;
    const pricing = await prisma.planPricing.update({
      where: { id: pricingId },
      data: { interval, price: parseFloat(price), currency, isActive }
    });
    res.json(pricing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
};

export const deletePricing = async (req, res) => {
  try {
    const { pricingId } = req.params;
    await prisma.planPricing.delete({ where: { id: pricingId } });
    res.json({ message: 'Pricing deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete pricing' });
  }
};
