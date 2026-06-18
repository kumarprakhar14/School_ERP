import { loadFeatureContext } from '../services/featureContextLoader.js';
import { resolveAllFeatures } from '../services/featureEvaluator.js';

export const getSchoolFeatureDiagnostics = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Load the complete context from the database
    const context = await loadFeatureContext(schoolId);

    // Evaluate all system features for this specific context
    const featureEvaluations = resolveAllFeatures(context);

    // Build the diagnostic tree response
    const diagnostics = {
      schoolId: context.schoolId,
      activeSubscription: context.activeSubscription ? {
        id: context.activeSubscription.id,
        planId: context.activeSubscription.planId,
        planName: context.plan?.name,
        status: context.activeSubscription.status,
        startsAt: context.activeSubscription.startsAt,
        expiresAt: context.activeSubscription.expiresAt
      } : null,
      globalFlags: context.globalFlags.map(f => ({
        featureId: f.featureId,
        isEnabled: f.isEnabled,
        reason: f.reason
      })),
      schoolOverrides: context.schoolOverrides.map(o => ({
        featureId: o.featureId,
        isEnabled: o.isEnabled,
        limitValue: o.limitValue,
        reason: o.reason
      })),
      evaluations: featureEvaluations
    };

    res.json(diagnostics);
  } catch (error) {
    console.error('Failed to generate feature diagnostics:', error);
    res.status(500).json({ error: 'Failed to generate feature diagnostics' });
  }
};
