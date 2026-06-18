import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Loader2, Check } from 'lucide-react';
import { planService } from '../../services/api/subscription';
import { toast } from 'sonner';

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    badge: '',
    isDefault: false,
    isPublic: true,
    isActive: true,
    displayOrder: 0
  });

  const [pricingData, setPricingData] = useState({
    interval: 'MONTHLY',
    price: 0,
    currency: 'INR',
    isActive: true
  });

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await planService.getPlans();
      setPlans(res.data);
    } catch (error) {
      toast.error('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, formData);
        toast.success('Plan updated');
      } else {
        await planService.createPlan(formData);
        toast.success('Plan created');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error('Failed to save plan');
    }
  };

  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    try {
      await planService.addPricing(selectedPlan.id, pricingData);
      toast.success('Pricing added');
      setIsPricingModalOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error('Failed to add pricing');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await planService.deletePlan(id);
      toast.success('Plan deleted');
      fetchPlans();
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const handleDeletePricing = async (planId, pricingId) => {
    if (!window.confirm('Delete this pricing option?')) return;
    try {
      await planService.deletePricing(planId, pricingId);
      toast.success('Pricing deleted');
      fetchPlans();
    } catch (error) {
      toast.error('Failed to delete pricing');
    }
  };

  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        badge: plan.badge || '',
        isDefault: plan.isDefault,
        isPublic: plan.isPublic,
        isActive: plan.isActive,
        displayOrder: plan.displayOrder
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', description: '', badge: '', isDefault: false, isPublic: true, isActive: true, displayOrder: plans.length + 1 });
    }
    setIsModalOpen(true);
  };

  const openPricingModal = (plan) => {
    setSelectedPlan(plan);
    setPricingData({ interval: 'MONTHLY', price: 0, currency: 'INR', isActive: true });
    setIsPricingModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subscription Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Manage base plans and their pricing intervals</p>
        </div>
        <button
          onClick={() => openPlanModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-xl border ${plan.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/20'} shadow-sm flex flex-col`}>
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {plan.name}
                      {plan.isDefault && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Default</span>}
                      {!plan.isPublic && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Hidden</span>}
                    </h3>
                    {plan.badge && (
                      <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openPlanModal(plan)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 h-10">{plan.description}</p>
              </div>

              <div className="p-5 flex-1 bg-gray-50/50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Pricing Tiers</h4>
                  <button onClick={() => openPricingModal(plan)} className="text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </button>
                </div>
                
                {plan.pricing?.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-2">No pricing added yet</p>
                ) : (
                  <div className="space-y-2">
                    {plan.pricing?.map((p) => (
                      <div key={p.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm text-sm group">
                        <div className="flex items-center">
                          <Tag className="w-3.5 h-3.5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-700">{p.interval}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-bold text-gray-900 mr-3">{p.currency} {p.price}</span>
                          <button onClick={() => handleDeletePricing(plan.id, p.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge (Optional)</label>
                  <input type="text" placeholder="e.g. Popular" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" required value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Default Plan</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.isPublic} onChange={e => setFormData({...formData, isPublic: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Public</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Active</span>
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Add Pricing to {selectedPlan?.name}</h2>
              <button onClick={() => setIsPricingModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePricingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                <select value={pricingData.interval} onChange={e => setPricingData({...pricingData, interval: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONCE">Once</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input type="number" step="0.01" required value={pricingData.price} onChange={e => setPricingData({...pricingData, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input type="text" required value={pricingData.currency} onChange={e => setPricingData({...pricingData, currency: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Save Pricing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
