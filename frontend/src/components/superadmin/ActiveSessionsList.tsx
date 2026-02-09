import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';

interface ActiveSession {
  id: number;
  user_email: string;
  user_id: number;
  session_key: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export default function ActiveSessionsList() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revokeIds, setRevokeIds] = useState<number[]>([]);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await superadminApi.security.getActiveSessions();
      setSessions(response.data.sessions);
      setCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      await superadminApi.security.revokeSessions(revokeIds);
      toast.success(`${revokeIds.length} session(s) revoked successfully`);
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to revoke sessions');
    } finally {
      setRevokeIds([]);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await superadminApi.security.revokeSessions();
      toast.success('All sessions revoked successfully');
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to revoke all sessions');
    } finally {
      setShowRevokeAll(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-400">Total active sessions: <span className="text-white font-semibold">{count}</span></p>
          {sessions.length < count && (
            <p className="text-xs text-gray-500 mt-1">Showing first 100 sessions</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSessions}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowRevokeAll(true)}
            disabled={sessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Revoke All
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No active sessions
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Device</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Activity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Expires</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div className="text-white">{session.user_email}</div>
                    <div className="text-xs text-gray-500 font-mono">{session.session_key}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-mono text-sm">{session.ip_address}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm max-w-xs truncate" title={session.user_agent}>
                    {session.user_agent}
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(session.last_activity)}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(session.expires_at)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setRevokeIds([session.id])}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeIds.length > 0 && (
        <ConfirmActionDialog
          open={true}
          title="Revoke Session"
          description="Are you sure you want to revoke this session? The user will be logged out immediately."
          confirmText="Revoke"
          onConfirm={handleRevoke}
          onClose={() => setRevokeIds([])}
        />
      )}

      {showRevokeAll && (
        <ConfirmActionDialog
          open={true}
          title="Revoke All Sessions"
          description={`Are you sure you want to revoke all ${count} active sessions? All users will be logged out immediately. This action cannot be undone.`}
          confirmText="Revoke All"
          onConfirm={handleRevokeAll}
          onClose={() => setShowRevokeAll(false)}
        />
      )}
    </div>
  );
}
