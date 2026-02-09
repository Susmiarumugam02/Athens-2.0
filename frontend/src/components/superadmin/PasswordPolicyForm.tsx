import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';

interface PasswordPolicy {
  id: number;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  expiry_days: number;
  history_count: number;
  lockout_threshold: number;
  lockout_duration: number;
}

export default function PasswordPolicyForm() {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const response = await superadminApi.security.getPasswordPolicy();
      setPolicy(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load password policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await superadminApi.security.updatePasswordPolicy(policy);
      toast.success('Password policy updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update password policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!policy) {
    return <div className="text-gray-400">No policy found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Minimum Length
          </label>
          <input
            type="number"
            min="6"
            max="32"
            value={policy.min_length}
            onChange={(e) => setPolicy({ ...policy, min_length: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password Expiry (days)
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={policy.expiry_days}
            onChange={(e) => setPolicy({ ...policy, expiry_days: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">0 = never expires</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password History Count
          </label>
          <input
            type="number"
            min="0"
            max="24"
            value={policy.history_count}
            onChange={(e) => setPolicy({ ...policy, history_count: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Prevent reuse of last N passwords</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lockout Threshold
          </label>
          <input
            type="number"
            min="3"
            max="10"
            value={policy.lockout_threshold}
            onChange={(e) => setPolicy({ ...policy, lockout_threshold: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Failed attempts before lockout</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lockout Duration (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="1440"
            value={policy.lockout_duration}
            onChange={(e) => setPolicy({ ...policy, lockout_duration: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Complexity Requirements
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_uppercase}
            onChange={(e) => setPolicy({ ...policy, require_uppercase: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-300">Require uppercase letters (A-Z)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_lowercase}
            onChange={(e) => setPolicy({ ...policy, require_lowercase: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-300">Require lowercase letters (a-z)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_numbers}
            onChange={(e) => setPolicy({ ...policy, require_numbers: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-300">Require numbers (0-9)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_special_chars}
            onChange={(e) => setPolicy({ ...policy, require_special_chars: e.target.checked })}
            className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-300">Require special characters (!@#$%^&*)</span>
        </label>
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
