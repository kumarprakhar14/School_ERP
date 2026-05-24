import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({ themeColor: '#3b82f6', description: '', logoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/schools/settings');
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/schools/settings', settings);
      document.documentElement.style.setProperty('--app-theme-color', settings.themeColor);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center flex justify-center"><span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-sm border border-blue-200/50">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">School Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update your school's branding and description</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent opacity-50 pointer-events-none"></div>
        <form onSubmit={handleSave} className="p-6 space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Theme Color</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="color"
                  value={settings.themeColor || '#3b82f6'}
                  onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })}
                  className="h-12 w-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                />
              </div>
              <span className="text-sm text-gray-500 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{settings.themeColor || '#3b82f6'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">School Description</label>
            <textarea
              rows={4}
              value={settings.description || ''}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow shadow-sm placeholder-gray-400"
              placeholder="A brief description of your school..."
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg hover:opacity-90 transition-all font-medium text-sm disabled:opacity-70 focus:ring-4 focus:ring-blue-200"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2"></span> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
