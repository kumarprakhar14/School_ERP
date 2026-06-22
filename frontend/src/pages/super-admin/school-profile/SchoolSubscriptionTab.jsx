import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertTriangle, Play, Pause, XCircle, Settings, Check, X, Calendar, Edit2, Activity, ArrowRight, Loader2, Search } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';

export default function SchoolSubscriptionTab({ schoolId }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  
  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [actionModal, setActionModal] = useState({ show: false, action: '', title: '' });
  
  // Forms data
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [assignForm, setAssignForm] = useState({ planId: '', planPricingId: '', activationMode: 'Immediate', effectiveDate: '', notes: '' });
  const [overrideForm, setOverrideForm] = useState({ featureId: '', isEnabled: true, limitValue: '', limitUnit: '', expiresAt: '', reason: '' });
  const [actionNotes, setActionNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [histRes, overRes, diagRes, plansRes, featRes] = await Promise.all([
        api.get(`/subscriptions/schools/${schoolId}`),
        api.get(`/subscriptions/overrides/${schoolId}`),
        api.get(`/diagnostics/features/${schoolId}`),
        api.get('/plans'),
        api.get('/features')
      ]);
      setHistory(histRes.data);
      setOverrides(overRes.data);
      setDiagnostics(diagRes.data);
      setPlans(plansRes.data);
      setFeatures(featRes.data);
    } catch (err) {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const handleAction = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/subscriptions/schools/${schoolId}/${actionModal.action}`, { notes: actionNotes });
      toast.success(`Subscription ${actionModal.action}ed successfully`);
      setActionModal({ show: false, action: '', title: '' });
      setActionNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to ${actionModal.action}`);
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...assignForm };
      if (payload.activationMode === 'Immediate') delete payload.effectiveDate;
      await api.post(`/subscriptions/schools/${schoolId}/assign`, payload);
      toast.success('Plan assigned successfully');
      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign plan');
    }
  };

  const handleCreateOverride = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/subscriptions/overrides/${schoolId}`, {
        ...overrideForm,
        limitValue: overrideForm.limitValue ? parseInt(overrideForm.limitValue) : null
      });
      toast.success('Override applied successfully');
      setShowOverrideModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create override');
    }
  };

  const handleArchiveOverride = async (id) => {
    if (!window.confirm('Archive this override?')) return;
    try {
      await api.put(`/subscriptions/overrides/${id}/archive`);
      toast.success('Override archived');
      fetchData();
    } catch (error) {
      toast.error('Failed to archive override');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  const activeSub = history.find(h => h.status === 'ACTIVE' || h.status === 'SUSPENDED');

  return (
    <div className="space-y-6">
      
      {/* Overview & Controls */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><Activity className="w-5 h-5 mr-2 text-indigo-600" /> Subscription Overview</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowAssignModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors flex items-center"><Edit2 className="w-3.5 h-3.5 mr-1.5"/> Assign Plan</button>
          </div>
        </div>
        <div className="p-6">
          {activeSub ? (
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Current Plan</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">{activeSub.plan.name}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${activeSub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {activeSub.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-4">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-gray-400"/> Started: {new Date(activeSub.startsAt).toLocaleDateString()}</span>
                  {activeSub.expiresAt && <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-gray-400"/> Expires: {new Date(activeSub.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSub.status === 'ACTIVE' && (
                  <button onClick={() => setActionModal({ show: true, action: 'suspend', title: 'Suspend Subscription' })} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors flex items-center"><Pause className="w-3.5 h-3.5 mr-1.5"/> Suspend</button>
                )}
                {activeSub.status === 'SUSPENDED' && (
                  <button onClick={() => setActionModal({ show: true, action: 'reactivate', title: 'Reactivate Subscription' })} className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center"><Play className="w-3.5 h-3.5 mr-1.5"/> Reactivate</button>
                )}
                <button onClick={() => setActionModal({ show: true, action: 'cancel', title: 'Cancel Subscription' })} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center"><XCircle className="w-3.5 h-3.5 mr-1.5"/> Cancel</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">No active subscription found.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Timeline */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center"><Clock className="w-5 h-5 mr-2 text-indigo-600" /> Subscription History</h2>
          </div>
          <div className="p-6 relative">
            <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-gray-100"></div>
            <div className="space-y-6">
              {history.map((sub, i) => (
                <div key={sub.id} className="relative flex items-start group">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white ${sub.status === 'ACTIVE' ? 'bg-green-500' : sub.status === 'CANCELLED' ? 'bg-red-500' : 'bg-gray-400'}`}>
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{sub.plan.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{sub.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-600">{new Date(sub.startsAt).toLocaleDateString()} - {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'Ongoing'}</p>
                        {sub.activatedBy && <p className="text-[10px] text-gray-400 mt-1">by {sub.activatedBy.name}</p>}
                      </div>
                    </div>
                    {sub.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-line">{sub.notes}</p>}
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="text-gray-400 text-sm italic pl-8">No history recorded.</p>}
            </div>
          </div>
        </div>

        {/* Feature Overrides */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center"><Settings className="w-5 h-5 mr-2 text-indigo-600" /> Feature Overrides</h2>
            <button onClick={() => setShowOverrideModal(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded">Add Override</button>
          </div>
          <div className="p-0">
            {overrides.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No specific overrides configured.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-50">
                  {overrides.map(o => (
                    <tr key={o.id} className={o.isActive ? '' : 'opacity-50'}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{o.feature.name}</div>
                        <div className="text-xs text-gray-500">{o.reason || 'No reason provided'}</div>
                        {!o.isActive && <div className="text-[10px] uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded inline-block mt-1">Archived</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${o.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {o.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {o.isActive && (
                          <button onClick={() => handleArchiveOverride(o.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Archive</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center"><Search className="w-5 h-5 mr-2 text-indigo-600" /> Evaluation Diagnostics</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">Real-time evaluation tree for all system features.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(diagnostics.evaluations).map(([key, evalObj]) => (
                <div key={key} className={`border rounded-xl p-4 ${evalObj.enabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900">{key}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${evalObj.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{evalObj.enabled ? 'Access' : 'Denied'}</span>
                  </div>
                  <div className="text-xs space-y-1 mt-3">
                    <div className="flex justify-between"><span className="text-gray-500">Source:</span> <span className="font-mono text-gray-700">{evalObj.source}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Code:</span> <span className="font-mono text-gray-700">{evalObj.code}</span></div>
                    {evalObj.limit && <div className="flex justify-between"><span className="text-gray-500">Limit:</span> <span className="font-mono font-bold text-indigo-600">{evalObj.limit.value} {evalObj.limit.unit}</span></div>}
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 border-t pt-2 border-gray-200/50">{evalObj.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Assign Plan</h2>
              <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAssignPlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                <select required value={assignForm.planId} onChange={e => setAssignForm({...assignForm, planId: e.target.value, planPricingId: ''})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="">-- Select Plan --</option>
                  {plans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              {assignForm.planId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Interval (Optional)</label>
                  <select value={assignForm.planPricingId} onChange={e => setAssignForm({...assignForm, planPricingId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="">-- No specific pricing attached --</option>
                    {plans.find(p => p.id === assignForm.planId)?.pricing?.filter(pr => pr.isActive).map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.interval} - {pr.currency} {pr.price}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-xl">
                <label className={`flex items-center justify-center p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${assignForm.activationMode === 'Immediate' ? 'bg-white shadow-sm border border-gray-200 text-indigo-600' : 'text-gray-500'}`}>
                  <input type="radio" className="sr-only" checked={assignForm.activationMode === 'Immediate'} onChange={() => setAssignForm({...assignForm, activationMode: 'Immediate'})}/>
                  Immediate
                </label>
                <label className={`flex items-center justify-center p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${assignForm.activationMode === 'Schedule' ? 'bg-white shadow-sm border border-gray-200 text-indigo-600' : 'text-gray-500'}`}>
                  <input type="radio" className="sr-only" checked={assignForm.activationMode === 'Schedule'} onChange={() => setAssignForm({...assignForm, activationMode: 'Schedule'})}/>
                  Schedule
                </label>
              </div>

              {assignForm.activationMode === 'Schedule' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                  <input type="date" required value={assignForm.effectiveDate} onChange={e => setAssignForm({...assignForm, effectiveDate: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows="2" value={assignForm.notes} onChange={e => setAssignForm({...assignForm, notes: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Reason for assignment..."></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Assign Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Add Feature Override</h2>
              <button onClick={() => setShowOverrideModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateOverride} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature</label>
                <select required value={overrideForm.featureId} onChange={e => setOverrideForm({...overrideForm, featureId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="">-- Select Feature --</option>
                  {features.filter(f => f.isActive).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                {overrideForm.featureId && diagnostics && (
                  <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded">
                    Current Inherited Value: <strong className="text-gray-800">{diagnostics.evaluations[features.find(f => f.id === overrideForm.featureId)?.key]?.enabled ? 'Enabled' : 'Disabled'}</strong>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <input type="checkbox" checked={overrideForm.isEnabled} onChange={e => setOverrideForm({...overrideForm, isEnabled: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded"/>
                <span className="text-sm font-medium text-gray-900">Enable this feature for this school</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Limit Value</label>
                  <input type="number" value={overrideForm.limitValue} onChange={e => setOverrideForm({...overrideForm, limitValue: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g., 1000"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limit Unit</label>
                  <input type="text" value={overrideForm.limitUnit} onChange={e => setOverrideForm({...overrideForm, limitUnit: e.target.value.toUpperCase()})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g., STUDENTS"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Audit Log)</label>
                <input required type="text" value={overrideForm.reason} onChange={e => setOverrideForm({...overrideForm, reason: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Contract agreement, support ticket #123"/>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowOverrideModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Save Override</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generic Action Modal */}
      {actionModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900">{actionModal.title}</h2>
              <button onClick={() => setActionModal({ show: false, action: '', title: '' })}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                <textarea required rows="3" value={actionNotes} onChange={e => setActionNotes(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Enter reason for this action..."></textarea>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setActionModal({ show: false, action: '', title: '' })} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" className={`px-4 py-2 text-sm text-white rounded-xl ${actionModal.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
