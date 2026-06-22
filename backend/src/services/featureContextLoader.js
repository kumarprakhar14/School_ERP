import prisma from '../utils/db.js';

/**
 * Loads all feature-related context for a given school from the database.
 * This is designed to be called ONCE per request to enable request-level memoization
 * and avoid N+1 query problems during feature evaluation.
 * 
 * @param {string} schoolId 
 * @returns {Promise<Object>} The fully loaded context
 */
export const loadFeatureContext = async (schoolId) => {
  if (!schoolId) {
    throw new Error('schoolId is required to load feature context');
  }

  // Run all independent queries concurrently
  const [
    activeSubscription,
    schoolOverrides,
    globalFlags,
    allSystemFeatures
  ] = await Promise.all([
    // 1. Get the current active subscription
    prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { startsAt: 'desc' },
      include: {
        plan: {
          include: {
            features: true // Pre-fetch the plan's feature mappings
          }
        }
      }
    }),
    
    // 2. Get school-specific overrides
    prisma.schoolFeatureOverride.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    }),

    // 3. Get global feature flags
    prisma.globalFeatureFlag.findMany({
      where: { isActive: true }
    }),

    // 4. Get the master list of all features
    prisma.feature.findMany({
      where: { isActive: true } // only load active system features
    })
  ]);

  return {
    schoolId,
    activeSubscription,
    plan: activeSubscription?.plan || null,
    planFeatures: activeSubscription?.plan?.features || [],
    schoolOverrides,
    globalFlags,
    allSystemFeatures
  };
};
