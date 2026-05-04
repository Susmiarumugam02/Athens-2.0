import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { superadminApi } from '@/services/superadmin/superadminApi';

type Session = {
  id: number | string;
  ip_address?: string;
  user_agent?: string;
  last_activity?: string;
  created_at?: string;
};

type Props = {
  open: boolean;
  userId: number;
  onClose: () => void;
  onSuccess?: (message?: string) => void;
  onError?: (message?: string) => void;
};

export function SessionsDrawer({ open, userId, onClose, onSuccess, onError }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superadminApi.users.getSessions(userId);
      setSessions(res.data ?? []);
    } catch {
      onError?.('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const revoke = async (sessionId: string | number) => {
    setRevoking(sessionId);
    try {
      await superadminApi.users.revokeSession(userId, Number(sessionId));
      onSuccess?.('Session revoked');
      await load();
    } catch {
      onError?.('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Active Sessions">
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No active sessions</div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={String(s.id)} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.ip_address ?? 'Unknown IP'}</p>
                  <p className="text-xs text-gray-500 break-words">{s.user_agent ?? 'Unknown agent'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last: {s.last_activity ?? s.created_at ?? '-'}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={revoking === s.id}
                  onClick={() => revoke(s.id)}
                >
                  {revoking === s.id ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
