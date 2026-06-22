import prisma from '../utils/db.js';

// GET /api/subscriptions/overrides/:schoolId
export const getSchoolOverrides = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const overrides = await prisma.schoolFeatureOverride.findMany({
      where: { schoolId },
      include: {
        feature: true,
        updatedBy: { select: { id: true, name: true, erpId: true } }
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
    const { featureId, isEnabled, limitValue, limitUnit, reason, expiresAt } = req.body;
    const adminId = req.user.userId;

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const newOverride = await prisma.$transaction(async (tx) => {
      // Archive any currently active override for this feature/school combination
      await tx.schoolFeatureOverride.updateMany({
        where: { schoolId, featureId, isActive: true },
        data: { isActive: false }
      });

      // Create the new override
      return await tx.schoolFeatureOverride.create({
        data: {
          schoolId,
          featureId,
          isEnabled,
          limitValue: limitValue !== null && limitValue !== undefined && limitValue !== '' ? parseInt(limitValue, 10) : null,
          limitUnit: limitUnit || null,
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          updatedById: adminId,
          isActive: true
        },
        include: { feature: true }
      });
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
    const adminId = req.user.userId;

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
