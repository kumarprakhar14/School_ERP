import prisma from '../utils/db.js';

export const getFeatures = async (req, res) => {
  try {
    const features = await prisma.feature.findMany({
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' }
      ]
    });
    res.json(features);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
};

export const createFeature = async (req, res) => {
  try {
    const { key, name, category, description, icon, displayOrder, isCore, isActive } = req.body;
    const feature = await prisma.feature.create({
      data: { key, name, category, description, icon, displayOrder, isCore, isActive }
    });
    res.status(201).json(feature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create feature' });
  }
};

export const updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { key, name, category, description, icon, displayOrder, isCore, isActive } = req.body;
    const feature = await prisma.feature.update({
      where: { id },
      data: { key, name, category, description, icon, displayOrder, isCore, isActive }
    });
    res.json(feature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
};

export const deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.feature.delete({ where: { id } });
    res.json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
};
