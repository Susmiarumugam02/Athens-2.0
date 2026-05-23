import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  KeyRound, QrCode, ShieldCheck, RefreshCw, Download,
  UserPlus, CheckCircle, XCircle, Clock, Users, Loader2,
  Copy, Check,
} from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  present:   { label: 'Verified',  cls: 'bg-green-100  text-green-800  border border-green-200'  },
  completed: { label: 'Completed', cls: 'bg-blue-100   text-blue-800   border border-blue-200'   },
  absent:    { label: 'Rejected',  cls: 'bg-red-100    text-red-800    border border-red-200'     },
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
};

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR', otp: 'OTP', face: 'Face', admin: 'Admin', geo: 'GPS', online: 'Online',
};

export default function AttendanceManagementPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [otp, setOtp] = useState<{ code: string; expires_at: string } | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, aRes, lRes] = await Promise.all([
        apiClient.get(`/api/training/trainings/${trainingId}/`),
        apiClient.get(`/api/training/trainings/${trainingId}/attendances/`),
        apiClient.get(`/api/training/trainings/${trainingId}/live-count/`),
      ]);
      setTraining(tRes.data);
      setAttendances(Array.isArray(aRes.data) ? aRes.data : (aRes.data?.results ?? []));
      setLiveCount(lRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // live refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const generateOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await apiClient.post(`/api/training/trainings/${trainingId}/generate-otp/`);
      setOtp({ code: res.data.otp, expires_at: res.data.expires_at });
    } catch {
      alert('Failed to generate OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const copyOtp = () => {
    if (otp) {
      navigator.clipboard.writeText(otp.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const approveAttendance = async (userId: number) => {
    setApprovingId(userId);
    try {
      await apiClient.post(`/api/training/trainings/${trainingId}/approve/${userId}/`);
      fetchData();
    } catch {
      alert('Failed to approve attendance');
    } finally {
      setApprovingId(null);
    }
  };

  const markAttendance = async (userId: number, status: 'present' | 'absent' | 'completed') => {
    try {
      await apiClient.post(`/api/training/trainings/${trainingId}/mark_attendance/`, {
        user_id: userId, attendance_status: status,
      });
      fetchData();
    } catch {
      alert('Failed to mark attendance');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Training', training?.title || ''],
      ['Date', training?.training_date || ''],
      ['Trainer', training?.trainer || ''],
      [],
      ['Name', 'Email', 'Dept', 'Status', 'Method', 'Verified By', 'Marked At'],
      ...attendances.map((a: any) => [
        a.user_name || '', a.user_email || '', a.department || '',
        a.attendance_status || '', a.attendance_method || '', a.verified_by || '',
        a.marked_at ? new Date(a.marked_at).toLocaleString() : '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${trainingId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pendingAdminApproval = attendances.filter(
    (a: any) => a.attendance_status === 'pending' && a.attendance_method === 'admin'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isInduction = ['induction', 'induction_training'].includes(training?.training_type);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800 text-sm">
        ← Back to Trainings
      </button>

      {/* Training info + KPIs */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{training?.title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span><strong>Type:</strong> {training?.training_type}</span>
              <span><strong>Mode:</strong> <span className="capitalize">{training?.mode || 'offline'}</span></span>
              <span><strong>Trainer:</strong> {training?.trainer}</span>
              <span><strong>Date:</strong> {training?.training_date}</span>
              <span><strong>Location:</strong> {training?.location}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={fetchData} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={exportCsv} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <UserPlus className="w-4 h-4" /> Add Attendees
            </button>
          </div>
        </div>

        {/* Live KPI row */}
        {liveCount && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total',     value: liveCount.total,     icon: <Users className="w-4 h-4" />,       cls: 'text-gray-700' },
              { label: 'Verified',  value: liveCount.verified,  icon: <CheckCircle className="w-4 h-4" />, cls: 'text-green-700' },
              { label: 'Pending',   value: liveCount.pending,   icon: <Clock className="w-4 h-4" />,       cls: 'text-yellow-700' },
              { label: 'Absent',    value: liveCount.absent,    icon: <XCircle className="w-4 h-4" />,     cls: 'text-red-700' },
              { label: 'Complete',  value: `${liveCount.completion_percentage}%`, icon: null, cls: 'text-blue-700' },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`flex items-center justify-center gap-1 text-xs font-medium ${k.cls} mb-1`}>
                  {k.icon}{k.label}
                </div>
                <div className={`text-2xl font-bold ${k.cls}`}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {liveCount && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${liveCount.completion_percentage}%` }}
              />
            </div>
          </div>
        )}

        {isInduction && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>⚠️ Induction Training:</strong> Marking users as Verified/Completed will automatically activate their accounts and grant full platform access.
          </div>
        )}
      </div>

      {/* Verification Tools */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* OTP Generator */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">OTP Attendance</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Generate a 6-digit OTP for attendees to enter on their devices.</p>

          {otp && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <div className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-700 mb-2">{otp.code}</div>
              <p className="text-xs text-blue-600">
                Expires: {new Date(otp.expires_at).toLocaleTimeString()}
              </p>
              <button onClick={copyOtp} className="mt-2 flex items-center gap-1 mx-auto text-xs text-blue-600 hover:text-blue-800">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy OTP'}
              </button>
            </div>
          )}

          <button
            onClick={generateOtp}
            disabled={otpLoading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {otp ? 'Regenerate OTP' : 'Generate OTP'}
          </button>
        </div>

        {/* QR Info */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">QR Code Attendance</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            The QR token is linked to this training's induction session. Attendees scan it to verify attendance.
          </p>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
            QR tokens are auto-generated per induction session. Share the QR code from the Induction Training record with attendees.
          </div>
        </div>
      </div>

      {/* Pending Admin Approvals */}
      {pendingAdminApproval.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-yellow-700" />
            <h2 className="font-semibold text-yellow-900">
              Pending Admin Approval ({pendingAdminApproval.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingAdminApproval.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  {a.profile_photo ? (
                    <img src={a.profile_photo} alt={a.user_name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      {(a.user_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.user_name}</p>
                    <p className="text-xs text-gray-500">{a.user_email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveAttendance(a.user)}
                    disabled={approvingId === a.user}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {approvingId === a.user && <Loader2 className="w-3 h-3 animate-spin" />}
                    Approve
                  </button>
                  <button
                    onClick={() => markAttendance(a.user, 'absent')}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Attendance Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">All Attendees ({attendances.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Employee', 'Email', 'Status', 'Method', 'Verified By', 'Marked At', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.map((a: any) => {
                const badge = STATUS_BADGE[a.attendance_status] || STATUS_BADGE.pending;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {a.profile_photo ? (
                          <img src={a.profile_photo} alt={a.user_name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {(a.user_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.user_name}</p>
                          <p className="text-xs text-gray-500">{[a.department, a.designation].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.user_email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {a.attendance_method ? (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">
                          {METHOD_LABEL[a.attendance_method] || a.attendance_method}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.verified_by || a.marked_by_email || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {a.marked_at ? new Date(a.marked_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {['pending', 'absent'].includes(a.attendance_status) && (
                          <button
                            onClick={() => approveAttendance(a.user)}
                            disabled={approvingId === a.user}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            ✓ Approve
                          </button>
                        )}
                        {['pending', 'present', 'completed'].includes(a.attendance_status) && (
                          <button
                            onClick={() => markAttendance(a.user, 'absent')}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            ✗ Absent
                          </button>
                        )}
                        {['completed', 'present'].includes(a.attendance_status) && (
                          <span className="text-green-600 text-xs font-medium self-center">✅</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {attendances.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No attendees yet. Click "Add Attendees" to assign users.
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddAttendeesModal
          trainingId={trainingId!}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function AddAttendeesModal({ trainingId, onClose, onSuccess }: {
  trainingId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/training/project-users/')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    try {
      await apiClient.post(`/api/training/trainings/${trainingId}/add_attendees/`, { user_ids: selected });
      onSuccess();
    } catch {
      alert('Failed to add attendees');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Add Attendees</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading users...</div>
        ) : (
          <>
            <div className="space-y-1 max-h-80 overflow-y-auto mb-4 border border-gray-200 rounded-lg">
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">No users found in this project.</div>
              )}
              {users.map((u: any) => (
                <label key={u.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={e => setSelected(e.target.checked ? [...selected, u.id] : selected.filter(id => id !== u.id))}
                    className="mr-3"
                  />
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email} · {u.status}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={submit}
                disabled={selected.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add {selected.length} Attendee{selected.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
