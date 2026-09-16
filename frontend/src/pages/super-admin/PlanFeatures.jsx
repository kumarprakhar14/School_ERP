import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { planService, featureService, planFeatureService } from '../../services/api/subscription';
import { toast } from 'sonner';
import ResponsiveTable from '../../components/ui/ResponsiveTable';

export default function PlanFeatures() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [planFeatures, setPlanFeatures] = useState([]);
  const [allFeatures, setAllFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    featureId: '',
    isEnabled: true,
    limitValue: '',
    limitUnit: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [plansRes, featuresRes, planFeaturesRes] = await Promise.all([
        planService.getPlans(),
        featureService.getFeatures(),
        planFeatureService.getPlanFeatures(planId)
      ]);
      
      const currentPlan = plansRes.data.find(p => p.id === planId);
      if (!currentPlan) throw new Error('Plan not found');
      
      setPlan(currentPlan);
      setAllFeatures(featuresRes.data);
      setPlanFeatures(planFeaturesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [planId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.featureId) {
      toast.error('Please select a feature');
      return;
    }
    
    try {
      // Check if updating or creating
      const existing = planFeatures.find(pf => pf.featureId === formData.featureId);
      
      const payload = {
        planId,
        featureId: formData.featureId,
        isEnabled: formData.isEnabled,
        limitValue: formData.limitValue || null,
        limitUnit: formData.limitUnit || null,
      };

      if (existing) {
        await planFeatureService.updatePlanFeature(existing.id, payload);
        toast.success('Feature mapping updated');
      } else {
        await planFeatureService.createPlanFeature(payload);
        toast.success('Feature mapped to plan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save plan feature mapping');
    }
  };

  const handleToggleEnable = async (pf) => {
    if (pf.feature.isCore) {
      toast.error('Core features cannot be disabled');
      return;
    }
    try {
      await planFeatureService.updatePlanFeature(pf.id, {
        ...pf,
        isEnabled: !pf.isEnabled
      });
      fetchData();
      toast.success(pf.isEnabled ? 'Feature disabled' : 'Feature enabled');
    } catch (error) {
      toast.error('Failed to toggle feature');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this feature from the plan?')) return;
    try {
      await planFeatureService.deletePlanFeature(id);
      toast.success('Feature removed from plan');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove feature');
    }
  };

  const openModal = (pf = null) => {
    if (pf) {
      setFormData({
        featureId: pf.featureId,
        isEnabled: pf.isEnabled,
        limitValue: pf.limitValue || '',
        limitUnit: pf.limitUnit || ''
      });
    } else {
      setFormData({
        featureId: '',
        isEnabled: true,
        limitValue: '',
        limitUnit: ''
      });
    }
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!plan) return <div className="p-6 text-red-500">Plan not found</div>;

  const unmappedFeatures = allFeatures.filter(f => !planFeatures.some(pf => pf.featureId === f.id));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to="/super-admin/plans" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Plans
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {plan.name} Features
              {plan.badge && <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{plan.badge}</span>}
            </h1>
            <p className="text-gray-500 mt-1">Configure limits and toggle features for this plan.</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Map Feature
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ResponsiveTable
          data={planFeatures}
          keyExtractor={(pf) => pf.id}
          emptyMessage="No features mapped to this plan yet."
          columns={[
            {
              header: 'Feature',
              render: (pf) => (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{pf.feature.name}</span>
                    {pf.feature.isCore && <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" title="Core Infrastructure" />}
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{pf.feature.key}</div>
                </div>
              )
            },
            {
              header: 'Status',
              render: (pf) => (
                <button 
                  onClick={() => handleToggleEnable(pf)}
                  disabled={pf.feature.isCore}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    pf.isEnabled 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${pf.feature.isCore ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {pf.isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              )
            },
            {
              header: 'Limit',
              render: (pf) => (
                pf.limitValue ? (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{pf.limitValue}</span>
                    <span className="text-[10px] uppercase text-gray-500 tracking-wider">{pf.limitUnit || 'UNITS'}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs italic">Unlimited</span>
                )
              )
            },
            {
              header: 'Actions',
              align: 'right',
              render: (pf) => (
                <div className="flex justify-end gap-2">
                  <button onClick={() => openModal(pf)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit limit/status">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(pf.id)} 
                    disabled={pf.feature.isCore}
                    className={`p-1.5 rounded transition-colors ${
                      pf.feature.isCore 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title={pf.feature.isCore ? "Cannot delete core features" : "Remove from plan"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Map Feature</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Feature</label>
                <select 
                  required 
                  value={formData.featureId} 
                  onChange={e => setFormData({...formData, featureId: e.target.value})}
                  disabled={!!formData.featureId && planFeatures.some(pf => pf.featureId === formData.featureId)} // Disable if editing existing
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="">-- Choose Feature --</option>
                  {/* Show already mapped feature if editing */}
                  {formData.featureId && planFeatures.some(pf => pf.featureId === formData.featureId) && (
                    <option value={formData.featureId}>{allFeatures.find(f => f.id === formData.featureId)?.name}</option>
                  )}
                  {/* Show unmapped features */}
                  {unmappedFeatures.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limit Value</label>
                  <input type="number" placeholder="Leave empty for unlimited" value={formData.limitValue} onChange={e => setFormData({...formData, limitValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limit Unit</label>
                  <input type="text" placeholder="e.g. STUDENTS" value={formData.limitUnit} onChange={e => setFormData({...formData, limitUnit: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({...formData, isEnabled: e.target.checked})} className="rounded text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Enabled for this plan</span>
              </label>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm">Save Mapping</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
