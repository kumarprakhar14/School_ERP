import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Shield, X, Filter } from 'lucide-react';
import { featureService } from '../../../services/api/subscription';
import { toast } from 'sonner';

export default function FeaturesRegistry() {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    category: '',
    description: '',
    icon: '',
    displayOrder: 0,
    isCore: false,
    isActive: true
  });

  const fetchFeatures = async () => {
    try {
      setIsLoading(true);
      const res = await featureService.getFeatures();
      setFeatures(res.data);
    } catch (error) {
      toast.error('Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFeature) {
        await featureService.updateFeature(editingFeature.id, formData);
        toast.success('Feature updated');
      } else {
        await featureService.createFeature(formData);
        toast.success('Feature created');
      }
      setIsModalOpen(false);
      fetchFeatures();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save feature');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feature?')) return;
    try {
      await featureService.deleteFeature(id);
      toast.success('Feature deleted');
      fetchFeatures();
    } catch (error) {
      toast.error('Failed to delete feature');
    }
  };

  const openModal = (feature = null) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        key: feature.key,
        name: feature.name,
        category: feature.category,
        description: feature.description || '',
        icon: feature.icon || '',
        displayOrder: feature.displayOrder,
        isCore: feature.isCore,
        isActive: feature.isActive
      });
    } else {
      setEditingFeature(null);
      setFormData({ key: '', name: '', category: '', description: '', icon: '', displayOrder: features.length + 1, isCore: false, isActive: true });
    }
    setIsModalOpen(true);
  };

  const categories = ['All', ...new Set(features.map(f => f.category))];
  const filteredFeatures = filterCategory === 'All' ? features : features.filter(f => f.category === filterCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Features Registry</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the master list of sellable modules and add-ons</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Feature
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Key / Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">No features found in this category.</td>
                  </tr>
                ) : filteredFeatures.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {f.isCore ? (
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md" title="Core Infrastructure"><Shield className="w-4 h-4" /></div>
                          ) : (
                            <div className="p-1.5 bg-gray-50 border border-gray-200 text-gray-400 rounded-md"><span className="w-4 h-4 flex items-center justify-center font-mono text-xs">{f.icon || f.name.charAt(0)}</span></div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {f.name}
                            {f.isCore && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Core</span>}
                          </div>
                          <div className="text-gray-500 font-mono text-xs mt-0.5">{f.key}</div>
                          {f.description && <div className="text-gray-400 text-xs mt-1 truncate max-w-xs">{f.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {f.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${f.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(f)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-800">{editingFeature ? 'Edit Feature' : 'Create Feature'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unique Key <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="e.g. attendance" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '')})} disabled={!!editingFeature} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm" />
                  <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, hyphens, underscores only. Cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="e.g. Attendance Management" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <input required type="text" list="categories-list" placeholder="e.g. Academic, Administration" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <datalist id="categories-list">
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (optional text/emoji)</label>
                  <input type="text" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" required value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                  <div className="pt-0.5">
                    <input type="checkbox" checked={formData.isCore} onChange={e => setFormData({...formData, isCore: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block mb-0.5">Core Infrastructure</span>
                    <span className="text-xs text-gray-500">Enable this if the feature is mandatory and should never be disabled (e.g. Dashboard, Auth).</span>
                  </div>
                </label>
                
                <hr className="border-gray-200" />
                
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-green-600 focus:ring-green-500 w-4 h-4" />
                  <span className="font-semibold text-gray-900">Active (Available for mapping)</span>
                </label>
              </div>

            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 bg-white border border-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">Save Feature</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
