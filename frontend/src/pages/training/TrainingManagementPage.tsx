import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  QrCode, Download, Printer, RefreshCw, Users, Plus,
  X, Clock, AlertCircle, Loader2,
  Share2, LayoutDashboard,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  induction: 'Induction', induction_training: 'Induction',
  safety: 'Safety', safety_training: 'Safety',
  ptw_training: 'PTW', toolbox_training: 'Toolbox',
  inspection_training: 'Inspection', technical: 'Technical',
  compliance: 'Compliance', other: 'Other',
};

const STATUS_CLS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PARTICIPANT_REQUIRED = new Set([
  'induction', 'induction_training', 'safety', 'safety_training',
  'ptw_training', 'toolbox_training', 'inspection_training',
]);

// ─── QR Panel ────────────────────────────────────────────────────────────────

function QRPanel({ training, onClose }: { training: any; onClose: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [validHours, setValidHours] = useState(24);
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/training/trainings/${training.id}/qr-session/`);
      setSession(res.data.active ? res.data : null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [training.id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/api/training/trainings/${training.id}/generate-qr/`, {
        valid_hours: validHours,
      });
      setSession(res.data);
    } catch {
      alert('Failed to generate QR');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${training.title.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const printQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR — ${training.title}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        img { width: 300px; height: 300px; }
        h2 { margin: 16px 0 4px; }
        p { color: #555; margin: 4px 0; font-size: 14px; }
      </style></head><body>
      <img src="${dataUrl}" />
      <h2>${training.title}</h2>
      <p>Trainer: ${training.trainer} &nbsp;|&nbsp; Date: ${training.training_date}</p>
      <p>Location: ${training.location}</p>
      <p style="margin-top:12px;font-size:12px;color:#888;">Scan to mark induction attendance</p>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  const shareQR = async () => {
    if (!session?.qr_payload) return;
    const text = `Induction training QR\n${training.title}\nDate: ${training.training_date}\nLocation: ${training.location}\nToken: ${session.qr_token}`;
    if (navigator.share) {
      await navigator.share({ title: `QR - ${training.title}`, text });
      return;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(`Induction QR - ${training.title}`)}&body=${encodeURIComponent(text)}`;
  };

  const shareWhatsApp = () => {
    if (!session?.qr_payload) return;
    const text = `Induction training QR\n${training.title}\nDate: ${training.training_date}\nLocation: ${training.location}\nToken: ${session.qr_token}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const expiresAt = session?.expires_at ? new Date(session.expires_at) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">QR Attendance Code</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{training.title}</p>
            <p>{training.trainer} · {training.training_date} · {training.location}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : session && !isExpired ? (
            <>
              <div ref={qrRef} className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl border">
                <QRCodeCanvas
                  value={session.qr_payload}
                  size={240}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '',
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
                <div className="text-center">
                  <p className="text-xs font-mono text-gray-500 break-all">{session.qr_token}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires: {expiresAt?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadQR}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={printQR}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={shareQR}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  <Share2 className="w-4 h-4" /> Email
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              <button
                onClick={generate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Regenerate QR
              </button>
            </>
          ) : (
            <>
              {session && isExpired && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Previous QR has expired. Generate a new one.
                </div>
              )}
              {!session && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <QrCode className="w-4 h-4 shrink-0" />
                  No active QR session. Generate one for attendees to scan.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid for (hours)</label>
                <select
                  value={validHours}
                  onChange={e => setValidHours(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {[1, 4, 8, 12, 24, 48, 72].map(h => (
                    <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={generate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Generate QR Code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Training Modal ────────────────────────────────────────────────────

function CreateTrainingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (t: any) => void }) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    training_type: 'induction_training', mode: 'offline',
    title: '', trainer: '', training_date: '', training_time: '',
    location: '', duration_hours: '', description: '', status: 'scheduled',
  });
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [participantErr, setParticipantErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get('/api/training/project-users/')
      .then(r => setProjectUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const visible = projectUsers.filter(u => {
    const s = search.toLowerCase();
    const matchDept = deptFilter === 'all' || u.department === deptFilter;
    const text = `${u.name} ${u.email} ${u.department} ${u.designation} ${u.employee_code}`.toLowerCase();
    return matchDept && (!s || text.includes(s));
  });

  const depts = Array.from(new Set(projectUsers.map(u => u.department).filter(Boolean))).sort();

  const toggle = (id: number) => {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setParticipantErr('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(new Set(selected));
    if (PARTICIPANT_REQUIRED.has(form.training_type) && ids.length === 0) {
      setParticipantErr('Assign at least one employee.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/training/trainings/', {
        ...form,
        project: (user as any)?.project_id,
        assigned_user_ids: ids,
        duration_hours: form.duration_hours || null,
        training_time: form.training_time || null,
      });
      onSuccess(res.data);
    } catch (err: any) {
      const d = err?.response?.data;
      alert(typeof d === 'object'
        ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Failed to create training.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Create Training Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Type</label>
              <select value={form.training_type} onChange={e => setForm({ ...form, training_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="induction_training">Induction Training</option>
                <option value="safety_training">Safety Training</option>
                <option value="ptw_training">PTW Training</option>
                <option value="toolbox_training">Toolbox Talk</option>
                <option value="inspection_training">Inspection Training</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="offline">Offline (QR / Admin marks)</option>
                <option value="online">Online (User self-completes)</option>
              </select>
            </div>
          </div>

          {[
            { label: 'Title', key: 'title', type: 'text', required: true },
            { label: 'Trainer', key: 'trainer', type: 'text', required: true },
            { label: 'Location', key: 'location', type: 'text', required: true },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required={f.required} />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.training_date}
                onChange={e => setForm({ ...form, training_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input type="time" value={form.training_time}
                onChange={e => setForm({ ...form, training_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Safety Instructions</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
          </div>

          {/* Participants */}
          <div className={`rounded-lg border p-4 ${participantErr ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Participants</h3>
                <p className="text-xs text-gray-500">{selected.length} selected</p>
              </div>
              <button type="button" onClick={() => setSelected(visible.map(u => u.id))}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">Select all visible</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employees…"
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                <option value="all">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {participantErr && <p className="text-sm text-red-600 mb-2">{participantErr}</p>}
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
              {visible.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 shrink-0">
                    {(u.name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}{u.employee_code ? ` (${u.employee_code})` : ''}</p>
                    <p className="text-xs text-gray-500 truncate">{[u.department, u.designation].filter(Boolean).join(' · ')}</p>
                  </div>
                </label>
              ))}
              {visible.length === 0 && <p className="text-center py-6 text-sm text-gray-500">No approved employees found.</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating…' : 'Create Training'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrainingManagementPage() {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [qrTraining, setQrTraining] = useState<any>(null);

  const fetchTrainings = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/training/trainings/');
      setTrainings(Array.isArray(res.data) ? res.data : (res.data?.results ?? []));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

  const handleCreated = (training: any) => {
    setShowCreate(false);
    fetchTrainings();
    // Auto-open QR panel for induction trainings
    if (['induction', 'induction_training'].includes(training.training_type)) {
      setQrTraining(training);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Training Management</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Training
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Title', 'Type', 'Mode', 'Trainer', 'Date', 'Location', 'Status', 'Attendance', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trainings.map((t: any) => {
                const hasActiveQr = !!t.active_qr_session;
                const isInduction = ['induction', 'induction_training'].includes(t.training_type);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{TYPE_LABELS[t.training_type] || t.training_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{t.mode || 'offline'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.trainer}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.training_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.location}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLS[t.status] || 'bg-gray-100 text-gray-800'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.attendance_count?.completed + t.attendance_count?.present || 0} / {t.attendance_count?.total || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => navigate(`/app/training/${t.id}/attendance`)}
                          title="View Participants"
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                        >
                          <Users className="w-4 h-4" />
                          View Participants
                        </button>
                        {isInduction && (
                          <button
                            onClick={() => setQrTraining(t)}
                            title={hasActiveQr ? 'View Active QR' : 'Generate QR'}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium ${
                              hasActiveQr
                                ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                : 'text-purple-600 hover:bg-purple-50'
                            }`}
                          >
                            <QrCode className="w-4 h-4" />
                            {hasActiveQr ? 'Download QR' : 'Generate QR'}
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/app/training/${t.id}/attendance`)}
                          title="Attendance Dashboard"
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Attendance Dashboard
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {trainings.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No trainings yet. Create your first training session.
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTrainingModal onClose={() => setShowCreate(false)} onSuccess={handleCreated} />
      )}

      {qrTraining && (
        <QRPanel training={qrTraining} onClose={() => setQrTraining(null)} />
      )}
    </div>
  );
}
