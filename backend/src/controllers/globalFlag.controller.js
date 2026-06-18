import prisma from '../utils/db.js';

// GET /api/subscriptions/global-flags
export const getGlobalFlags = async (req, res) => {
  try {
    const flags = await prisma.globalFeatureFlag.findMany({
      include: {
        feature: true,
        updatedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(flags);
  } catch (error) {
    console.error('Failed to get global flags:', error);
    res.status(500).json({ error: 'Failed to retrieve global flags' });
  }
};

// POST /api/subscriptions/global-flags
export const createGlobalFlag = async (req, res) => {
  try {
    const { featureId, isEnabled, reason } = req.body;
    const adminId = req.user.id;

    // Archive any currently active flag for this feature
    await prisma.globalFeatureFlag.updateMany({
      where: { featureId, isActive: true },
      data: { isActive: false }
    });

    const newFlag = await prisma.globalFeatureFlag.create({
      data: {
        featureId,
        isEnabled,
        reason,
        updatedById: adminId,
        isActive: true
      },
      include: { feature: true }
    });

    res.status(201).json(newFlag);
  } catch (error) {
    console.error('Failed to create global flag:', error);
    res.status(500).json({ error: 'Failed to create global flag' });
  }
};

// PUT /api/subscriptions/global-flags/:id/archive
export const archiveGlobalFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const updated = await prisma.globalFeatureFlag.update({
      where: { id },
      data: { 
        isActive: false,
        updatedById: adminId 
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to archive global flag:', error);
    res.status(500).json({ error: 'Failed to archive global flag' });
  }
};
