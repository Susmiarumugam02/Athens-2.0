import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';

interface SessionSettings {
  id: number;
  timeout_minutes: number;
  max_concurrent_sessions: number;
  enable_device_tracking: boolean;
}

const inputCls   = 'w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls   = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const hintCls    = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
const checkCls   = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 accent-blue-600';
const titleCls   = 'text-sm font-medium text-gray-800 dark:text-gray-200';
const subtitleCls = 'text-sm text-gray-500 dark:text-gray-400';

export default function SessionSettingsForm() {
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await superadminApi.security.getSessionSettings();
      setSettings(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load session settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await superadminApi.security.updateSessionSettings(settings);
      toast.success('Session settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update session settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!settings) return <div className="text-gray-500 dark:text-gray-400">No settings found</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelCls}>Session Timeout (minutes)</label>
          <input
            type="number" min="5" max="1440"
            value={settings.timeout_minutes}
            onChange={(e) => setSettings({ ...settings, timeout_minutes: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>Idle timeout before automatic logout</p>
        </div>

        <div>
          <label className={labelCls}>Max Concurrent Sessions</label>
          <input
            type="number" min="1" max="10"
            value={settings.max_concurrent_sessions}
            onChange={(e) => setSettings({ ...settings, max_concurrent_sessions: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>Maximum active sessions per user</p>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enable_device_tracking}
            onChange={(e) => setSettings({ ...settings, enable_device_tracking: e.target.checked })}
            className={checkCls}
          />
          <div>
            <div className={titleCls}>Enable device tracking</div>
            <div className={subtitleCls}>Track device fingerprints for enhanced security</div>
          </div>
        </label>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
