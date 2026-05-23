import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';

interface TwoFactorSettings {
  id: number;
  enforce_for_all: boolean;
  enforce_for_roles: number[];
  allow_backup_codes: boolean;
  backup_codes_count: number;
}

const inputCls   = 'w-full max-w-xs px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls   = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const hintCls    = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
const checkCls   = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 accent-blue-600';
const titleCls   = 'text-sm font-medium text-gray-800 dark:text-gray-200';
const subtitleCls = 'text-sm text-gray-500 dark:text-gray-400';

export default function TwoFactorSettingsForm() {
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await superadminApi.security.get2FASettings();
      setSettings(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await superadminApi.security.update2FASettings(settings);
      toast.success('2FA settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update 2FA settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!settings) return <div className="text-gray-500 dark:text-gray-400">No settings found</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enforce_for_all}
            onChange={(e) => setSettings({ ...settings, enforce_for_all: e.target.checked })}
            className={checkCls}
          />
          <div>
            <div className={titleCls}>Enforce 2FA for all users</div>
            <div className={subtitleCls}>All users must enable 2FA to access the system</div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allow_backup_codes}
            onChange={(e) => setSettings({ ...settings, allow_backup_codes: e.target.checked })}
            className={checkCls}
          />
          <div>
            <div className={titleCls}>Allow backup codes</div>
            <div className={subtitleCls}>Users can generate backup codes for account recovery</div>
          </div>
        </label>
      </div>

      {settings.allow_backup_codes && (
        <div>
          <label className={labelCls}>Backup Codes Count</label>
          <input
            type="number" min="5" max="20"
            value={settings.backup_codes_count}
            onChange={(e) => setSettings({ ...settings, backup_codes_count: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>Number of backup codes to generate per user</p>
        </div>
      )}

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
