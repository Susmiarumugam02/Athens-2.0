import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';

interface SystemSettings {
  id: number;
  system_name: string;
  timezone: string;
  date_format: string;
  language: string;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export default function SystemSettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await superadminApi.settings.getSystem();
      setSettings(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await superadminApi.settings.updateSystem(settings);
      toast.success('System settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-gray-400">No settings found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            System Name
          </label>
          <input
            type="text"
            value={settings.system_name}
            onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
            <option value="Asia/Shanghai">Asia/Shanghai</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date Format
          </label>
          <select
            value={settings.date_format}
            onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD (2025-02-06)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (02/06/2025)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (06/02/2025)</option>
            <option value="DD-MMM-YYYY">DD-MMM-YYYY (06-Feb-2025)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Language
          </label>
          <select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Maintenance Message
        </label>
        <textarea
          value={settings.maintenance_message}
          onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
          rows={3}
          placeholder="Message to display when maintenance mode is enabled"
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">This message will be shown to users when maintenance mode is active</p>
      </div>

      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
