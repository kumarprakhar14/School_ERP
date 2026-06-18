import React, { useState, useEffect } from 'react';
import { Package, CheckCircle2, AlertCircle, RefreshCw, XCircle, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function SubscriptionCatalog() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans');
      // The backend GET /plans currently might not return plan features directly if it's just the basic plans controller.
      // Wait, in Phase I we built getPlans. Let's assume it returns { include: { features: { include: { feature: true } }, pricing: true } }.
      // If not, we will need to fetch features separately or just use what we have.
      setPlans(res.data);
      if (res.data.length > 0 && !expandedPlan) {
        setExpandedPlan(res.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load subscription catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center"><Package className="w-6 h-6 mr-3 text-indigo-600"/> Product Catalog</h1>
        <p className="text-gray-500 mt-2">Comprehensive view of all subscription plans, their associated feature entitlements, and pricing intervals.</p>
      </div>

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
            <div 
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              className={`p-5 cursor-pointer flex items-center justify-between transition-colors ${expandedPlan === plan.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {plan.name}
                    {!plan.isActive && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-200 text-gray-600">Inactive</span>}
                  </h2>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>
              </div>
              <div className="text-gray-400">
                {expandedPlan === plan.id ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
              </div>
            </div>

            {expandedPlan === plan.id && (
              <div className="border-t border-gray-100 p-6 bg-white animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Pricing Table */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center"><RefreshCw className="w-4 h-4 mr-2 text-indigo-600"/> Pricing Tiers</h3>
                    {plan.pricing && plan.pricing.length > 0 ? (
                      <div className="space-y-3">
                        {plan.pricing.map(p => (
                          <div key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50">
                            <div>
                              <span className="font-bold text-gray-900 block">{p.interval}</span>
                              <span className="text-xs text-gray-500">{p.isActive ? 'Active Plan' : 'Legacy Pricing'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-lg font-bold text-indigo-600">{p.currency} {p.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-gray-100">No pricing configured for this plan.</p>
                    )}
                  </div>

                  {/* Included Features */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center"><Settings className="w-4 h-4 mr-2 text-indigo-600"/> Feature Entitlements</h3>
                    {plan.features && plan.features.length > 0 ? (
                      <div className="space-y-2">
                        {plan.features.map(pf => (
                          <div key={pf.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              {pf.isEnabled ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              <span className={`text-sm font-medium ${pf.isEnabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{pf.feature?.name || 'Unknown Feature'}</span>
                            </div>
                            {pf.limitValue !== null && (
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Limit: {pf.limitValue} {pf.limitUnit}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
                        <AlertCircle className="w-5 h-5 mr-3"/>
                        <p className="text-sm font-medium">No features explicitly mapped. (Schools will default to false for all features).</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        ))}
        {plans.length === 0 && <div className="text-center py-12 text-gray-500">No subscription plans exist.</div>}
      </div>
    </div>
  );
}
