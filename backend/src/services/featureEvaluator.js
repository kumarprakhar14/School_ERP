/**
 * Pure business logic layer for evaluating feature access.
 * Does not depend on Express, Prisma, or any database access.
 */

const SOURCE = {
  GLOBAL_FLAG: 'GLOBAL_FLAG',
  SCHOOL_OVERRIDE: 'SCHOOL_OVERRIDE',
  PLAN: 'PLAN',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  FEATURE_NOT_FOUND: 'FEATURE_NOT_FOUND'
};

const buildResult = (enabled, source, code, message, featureKey, limit = null) => ({
  enabled,
  source,
  code,
  message,
  feature: featureKey,
  limit,
  evaluatedAt: new Date().toISOString()
});

/**
 * Evaluates access to a specific feature based on the provided loaded context.
 * 
 * @param {Object} context The loaded feature context
 * @param {string} featureKey The unique key of the feature to evaluate
 * @returns {Object} Structured resolution object
 */
export const evaluateAccess = (context, featureKey) => {
  const {
    allSystemFeatures,
    globalFlags,
    schoolOverrides,
    activeSubscription,
    planFeatures
  } = context;

  // 0. Verify the feature actually exists in the system
  const systemFeature = allSystemFeatures.find(f => f.key === featureKey);
  if (!systemFeature) {
    return buildResult(false, SOURCE.FEATURE_NOT_FOUND, 'FEATURE_NOT_FOUND', `Feature '${featureKey}' is not recognized by the system.`, featureKey);
  }

  // 1. Global Feature Flag Check
  const globalFlag = globalFlags.find(f => f.featureId === systemFeature.id);
  if (globalFlag) {
    if (!globalFlag.isEnabled) {
      return buildResult(false, SOURCE.GLOBAL_FLAG, 'GLOBAL_DISABLED', globalFlag.reason || `Feature '${featureKey}' is globally disabled.`, featureKey);
    } else {
      return buildResult(true, SOURCE.GLOBAL_FLAG, 'GLOBAL_ENABLED', globalFlag.reason || `Feature '${featureKey}' is globally enabled.`, featureKey);
    }
  }

  // 2. School Feature Override Check
  const override = schoolOverrides.find(o => o.featureId === systemFeature.id);
  if (override) {
    return buildResult(
      override.isEnabled,
      SOURCE.SCHOOL_OVERRIDE,
      override.isEnabled ? 'OVERRIDE_ENABLED' : 'OVERRIDE_DISABLED',
      override.reason || `School specific override for '${featureKey}'.`,
      featureKey,
      override.limitValue !== null ? { value: override.limitValue, unit: override.limitUnit || 'UNITS' } : null
    );
  }

  // 3. Active Subscription Check
  if (!activeSubscription) {
    return buildResult(false, SOURCE.NO_SUBSCRIPTION, 'NO_ACTIVE_SUBSCRIPTION', 'No active subscription found for this school.', featureKey);
  }

  // 4. Plan Feature Mapping Check
  const planFeature = planFeatures.find(pf => pf.featureId === systemFeature.id);
  if (planFeature) {
    if (planFeature.isEnabled) {
      return buildResult(
        true,
        SOURCE.PLAN,
        'FEATURE_INCLUDED',
        `Included in ${activeSubscription.plan.name} plan.`,
        featureKey,
        planFeature.limitValue !== null ? { value: planFeature.limitValue, unit: planFeature.limitUnit || 'UNITS' } : null
      );
    } else {
      return buildResult(false, SOURCE.PLAN, 'FEATURE_DISABLED_IN_PLAN', `Explicitly disabled in ${activeSubscription.plan.name} plan.`, featureKey);
    }
  }

  // Fallback: Not explicitly mapped to the plan
  return buildResult(false, SOURCE.PLAN, 'FEATURE_NOT_INCLUDED', `Not included in ${activeSubscription.plan.name} plan.`, featureKey);
};

/**
 * Evaluates access to all active system features for the given context.
 * 
 * @param {Object} context The loaded feature context
 * @returns {Record<string, Object>} A dictionary mapping featureKey to its resolution object
 */
export const resolveAllFeatures = (context) => {
  const result = {};
  for (const feature of context.allSystemFeatures) {
    result[feature.key] = evaluateAccess(context, feature.key);
  }
  return result;
};
