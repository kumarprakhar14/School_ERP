import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Plus, X, Search, CheckCircle2, XCircle, Power, Loader2, Archive } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function GlobalFeatureFlags() {
  const [flags, setFlags] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    featureId: '',
    isEnabled: false,
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [flagsRes, featuresRes] = await Promise.all([
        api.get('/subscriptions/global-flags'),
        api.get('/features')
      ]);
      setFlags(flagsRes.data);
      setFeatures(featuresRes.data);
    } catch (err) {
      toast.error('Failed to load global flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subscriptions/global-flags', formData);
      toast.success('Global flag set successfully');
      setShowModal(false);
      setFormData({ featureId: '', isEnabled: false, reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set global flag');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Are you sure you want to archive this global flag? The system will revert to plan-level evaluation.')) return;
    try {
      await api.put(`/subscriptions/global-flags/${id}/archive`);
      toast.success('Global flag archived');
      fetchData();
    } catch (err) {
      toast.error('Failed to archive flag');
    }
  };

  const filteredFlags = flags.filter(f => 
    f.feature.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.reason && f.reason.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-300 space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center"><ShieldAlert className="w-6 h-6 mr-3 text-red-600"/> Global Feature Flags</h1>
          <p className="text-gray-500 mt-2 max-w-3xl text-sm">Emergency kill switches and global overrides. These flags supersede ALL school subscriptions and overrides. Use with extreme caution.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center font-medium transition-colors shadow-sm"
        >
          <Power className="w-4 h-4 mr-2" /> Add Global Flag
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search flags..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredFlags.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Feature</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">State</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Reason</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Updated By</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFlags.map(f => (
                  <tr key={f.id} className={`hover:bg-gray-50/50 transition-colors ${!f.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{f.feature.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{f.feature.key}</div>
                      {!f.isActive && <div className="text-[10px] uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded inline-block mt-1">Archived</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${f.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {f.isEnabled ? <CheckCircle2 className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                        {f.isEnabled ? 'Globally Enabled' : 'Globally Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 truncate max-w-[200px] block" title={f.reason}>{f.reason || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{f.updatedBy?.name || 'System'}</div>
                      <div className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {f.isActive && (
                        <button 
                          onClick={() => handleArchive(f.id)}
                          className="text-gray-400 hover:text-gray-600 flex items-center justify-end w-full text-xs font-medium bg-gray-100 px-2 py-1 rounded"
                        >
                          <Archive className="w-3 h-3 mr-1" /> Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <ShieldAlert className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No global feature flags found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-red-50">
              <h2 className="font-bold text-red-900 flex items-center"><Power className="w-4 h-4 mr-2"/> Set Global Flag</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-red-400 hover:text-red-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-start text-sm">
                <AlertTriangle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <p>This action overrides <strong>every school's subscription plan</strong> instantly. It should primarily be used for emergency kill-switches.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Feature</label>
                <select required value={formData.featureId} onChange={e => setFormData({...formData, featureId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white">
                  <option value="">-- Select Feature --</option>
                  {features.filter(f => f.isActive).map(f => <option key={f.id} value={f.id}>{f.name} ({f.key})</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({...formData, isEnabled: e.target.checked})} className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"/>
                <span className="text-sm font-bold text-gray-900">Force Enabled</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 pl-2">If unchecked, the feature will be force-disabled globally.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audit Reason</label>
                <input required type="text" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="e.g., Major bug found, disabling for safety"/>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Apply Global Flag</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
