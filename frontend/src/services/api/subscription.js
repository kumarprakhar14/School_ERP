import api from './api';

export const planService = {
  getPlans: () => api.get('/plans'),
  createPlan: (data) => api.post('/plans', data),
  updatePlan: (id, data) => api.put(`/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/plans/${id}`),

  addPricing: (planId, data) => api.post(`/plans/${planId}/pricing`, data),
  updatePricing: (planId, pricingId, data) => api.put(`/plans/${planId}/pricing/${pricingId}`, data),
  deletePricing: (planId, pricingId) => api.delete(`/plans/${planId}/pricing/${pricingId}`),
};

export const featureService = {
  getFeatures: () => api.get('/features'),
  createFeature: (data) => api.post('/features', data),
  updateFeature: (id, data) => api.put(`/features/${id}`, data),
  deleteFeature: (id) => api.delete(`/features/${id}`),
};

export const planFeatureService = {
  getPlanFeatures: (planId) => api.get(`/plan-features/${planId}`),
  createPlanFeature: (data) => api.post('/plan-features', data),
  updatePlanFeature: (id, data) => api.put(`/plan-features/${id}`, data),
  deletePlanFeature: (id) => api.delete(`/plan-features/${id}`),
};
