import prisma from '../utils/db.js';

// GET /api/subscriptions/overrides/:schoolId
export const getSchoolOverrides = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const overrides = await prisma.schoolFeatureOverride.findMany({
      where: { schoolId },
      include: {
        feature: true,
        updatedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(overrides);
  } catch (error) {
    console.error('Failed to get school overrides:', error);
    res.status(500).json({ error: 'Failed to retrieve school overrides' });
  }
};

// POST /api/subscriptions/overrides/:schoolId
export const createSchoolOverride = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { featureId, isEnabled, limitValue, reason, expiresAt } = req.body;
    const adminId = req.user.id;

    // Archive any currently active override for this feature/school combination
    await prisma.schoolFeatureOverride.updateMany({
      where: { schoolId, featureId, isActive: true },
      data: { isActive: false }
    });

    // Create the new active override
    const newOverride = await prisma.schoolFeatureOverride.create({
      data: {
        schoolId,
        featureId,
        isEnabled,
        limitValue,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedById: adminId,
        isActive: true
      },
      include: { feature: true }
    });

    res.status(201).json(newOverride);
  } catch (error) {
    console.error('Failed to create school override:', error);
    res.status(500).json({ error: 'Failed to create school override' });
  }
};

// PUT /api/subscriptions/overrides/:id/archive
export const archiveSchoolOverride = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const updated = await prisma.schoolFeatureOverride.update({
      where: { id },
      data: { 
        isActive: false,
        updatedById: adminId 
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to archive override:', error);
    res.status(500).json({ error: 'Failed to archive override' });
  }
};
