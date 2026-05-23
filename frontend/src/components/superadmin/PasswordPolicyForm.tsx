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

const inputCls = 'w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
const hintCls  = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
const checkCls = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 accent-blue-600';
const checkLabelCls = 'text-sm text-gray-700 dark:text-gray-300';

export default function PasswordPolicyForm() {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPolicy(); }, []);

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

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!policy)  return <div className="text-gray-500 dark:text-gray-400">No policy found</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelCls}>Minimum Length</label>
          <input
            type="number" min="6" max="32"
            value={policy.min_length}
            onChange={(e) => setPolicy({ ...policy, min_length: parseInt(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Password Expiry (days)</label>
          <input
            type="number" min="0" max="365"
            value={policy.expiry_days}
            onChange={(e) => setPolicy({ ...policy, expiry_days: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>0 = never expires</p>
        </div>

        <div>
          <label className={labelCls}>Password History Count</label>
          <input
            type="number" min="0" max="24"
            value={policy.history_count}
            onChange={(e) => setPolicy({ ...policy, history_count: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>Prevent reuse of last N passwords</p>
        </div>

        <div>
          <label className={labelCls}>Lockout Threshold</label>
          <input
            type="number" min="3" max="10"
            value={policy.lockout_threshold}
            onChange={(e) => setPolicy({ ...policy, lockout_threshold: parseInt(e.target.value) })}
            className={inputCls}
          />
          <p className={hintCls}>Failed attempts before lockout</p>
        </div>

        <div>
          <label className={labelCls}>Lockout Duration (minutes)</label>
          <input
            type="number" min="5" max="1440"
            value={policy.lockout_duration}
            onChange={(e) => setPolicy({ ...policy, lockout_duration: parseInt(e.target.value) })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className={labelCls}>Complexity Requirements</label>

        {[
          { key: 'require_uppercase',    label: 'Require uppercase letters (A-Z)' },
          { key: 'require_lowercase',    label: 'Require lowercase letters (a-z)' },
          { key: 'require_numbers',      label: 'Require numbers (0-9)' },
          { key: 'require_special_chars',label: 'Require special characters (!@#$%^&*)' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={policy[key as keyof PasswordPolicy] as boolean}
              onChange={(e) => setPolicy({ ...policy, [key]: e.target.checked })}
              className={checkCls}
            />
            <span className={checkLabelCls}>{label}</span>
          </label>
        ))}
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
