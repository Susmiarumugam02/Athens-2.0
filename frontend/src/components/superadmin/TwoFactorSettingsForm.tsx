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

export default function TwoFactorSettingsForm() {
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-gray-400">No settings found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enforce_for_all}
            onChange={(e) => setSettings({ ...settings, enforce_for_all: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <div className="text-gray-300 font-medium">Enforce 2FA for all users</div>
            <div className="text-sm text-gray-500">All users must enable 2FA to access the system</div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allow_backup_codes}
            onChange={(e) => setSettings({ ...settings, allow_backup_codes: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <div className="text-gray-300 font-medium">Allow backup codes</div>
            <div className="text-sm text-gray-500">Users can generate backup codes for account recovery</div>
          </div>
        </label>
      </div>

      {settings.allow_backup_codes && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Backup Codes Count
          </label>
          <input
            type="number"
            min="5"
            max="20"
            value={settings.backup_codes_count}
            onChange={(e) => setSettings({ ...settings, backup_codes_count: parseInt(e.target.value) })}
            className="w-full max-w-xs px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Number of backup codes to generate per user</p>
        </div>
      )}

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
