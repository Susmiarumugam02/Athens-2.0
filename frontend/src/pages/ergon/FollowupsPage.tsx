import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle, Calendar, CheckCircle, Clock, Edit2, Phone, Plus, Search, Trash2, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'

// ─── Types ────────────────────────────────────────────────────────────────────

// Backend status choices: open | completed | cancelled | rescheduled
type FollowupStatus = 'open' | 'completed' | 'cancelled' | 'rescheduled'

interface Followup {
  id: number
  title: string
  description: string
  followup_date: string        // YYYY-MM-DD
  status: FollowupStatus
  company: string
  contact_person: string
  phone: string
  project_name: string
  completed_at: string | null
  created_by_name: string
  created_at: string
}

type FilterStatus = 'all' | 'open' | 'overdue' | 'completed' | 'cancelled' | 'rescheduled'

interface FormState {
  title: string
  description: string
  followup_date: string
  company: string
  contact_person: string
  phone: string
  project_name: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  followup_date: '',
  company: '',
  contact_person: '',
  phone: '',
  project_name: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(f: Followup): boolean {
  if (f.status === 'completed' || f.status === 'cancelled') return false
  return new Date(f.followup_date) < new Date(new Date().toDateString())
}

function effectiveStatus(f: Followup): string {
  if (isOverdue(f)) return 'overdue'
  return f.status
}

function statusColor(s: string): string {
  switch (s) {
    case 'completed':   return 'bg-green-100 text-green-800'
    case 'overdue':     return 'bg-red-100 text-red-800'
    case 'cancelled':   return 'bg-gray-100 text-gray-600'
    case 'rescheduled': return 'bg-purple-100 text-purple-800'
    default:            return 'bg-yellow-100 text-yellow-800'  // open
  }
}

function extractList(data: unknown): Followup[] {
  if (Array.isArray(data)) return data as Followup[]
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.data)) return d.data as Followup[]
    if (Array.isArray(d.results)) return d.results as Followup[]
  }
  return []
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard: React.FC<{
  title: string; value: number; subtitle?: string
  icon: React.ReactNode; color?: string; onClick?: () => void
}> = ({ title, value, subtitle, icon, color = 'text-primary', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-card border border-border rounded-xl p-3 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-accent ${color}`}>{icon}</div>
    </div>
    <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
    <div className="text-xs font-medium text-foreground mb-0.5">{title}</div>
    {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
  </div>
)

// ─── Follow-up Modal (Create / Edit) ─────────────────────────────────────────

const FollowupModal: React.FC<{
  open: boolean
  mode: 'create' | 'edit'
  initialValues: FormState
  loading: boolean
  onClose: () => void
  onSubmit: (values: FormState) => void
}> = ({ open, mode, initialValues, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(initialValues)

  useEffect(() => { if (open) setForm(initialValues) }, [open, initialValues])

  if (!open) return null

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim())         { toast.error('Title is required'); return }
    if (!form.followup_date)        { toast.error('Follow-up date is required'); return }
    if (!form.contact_person.trim()){ toast.error('Contact person is required'); return }
    onSubmit(form)
  }

  const cls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const lbl = 'block text-sm font-medium text-foreground mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'create' ? 'New Follow-up' : 'Edit Follow-up'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={lbl}>Title *</label>
            <input type="text" required value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Follow-up subject / title" className={cls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Contact Person *</label>
              <input type="text" required value={form.contact_person}
                onChange={e => set('contact_person', e.target.value)}
                placeholder="Full name" className={cls} />
            </div>
            <div>
              <label className={lbl}>Company</label>
              <input type="text" value={form.company}
                onChange={e => set('company', e.target.value)}
                placeholder="Company name" className={cls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210" className={cls} />
            </div>
            <div>
              <label className={lbl}>Follow-up Date *</label>
              <input type="date" required value={form.followup_date}
                onChange={e => set('followup_date', e.target.value)} className={cls} />
            </div>
          </div>

          <div>
            <label className={lbl}>Project / Reference</label>
            <input type="text" value={form.project_name}
              onChange={e => set('project_name', e.target.value)}
              placeholder="Project or reference name" className={cls} />
          </div>

          <div>
            <label className={lbl}>Description</label>
            <textarea rows={3} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Notes or details about this follow-up" className={cls} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 text-sm font-medium">
              {loading ? 'Saving…' : mode === 'create' ? 'Create Follow-up' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 text-sm font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FollowupsPage() {
  const [followups, setFollowups]   = useState<Followup[]>([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [actionId, setActionId]     = useState<number | null>(null)

  const [searchTerm, setSearchTerm]     = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const [createOpen, setCreateOpen]     = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [editingItem, setEditingItem]   = useState<Followup | null>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchFollowups = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (searchTerm)                          params.search = searchTerm
      if (filterStatus !== 'all')              params.status = filterStatus
      const res = await ergonApi.getFollowups()
      setFollowups(extractList(res.data))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterStatus])

  useEffect(() => { fetchFollowups() }, [fetchFollowups])

  // ── Client-side filter (search + status) ────────────────────────────────────
  // We fetch all and filter client-side so search is instant with no debounce lag

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return followups.filter(f => {
      const matchSearch = !q ||
        f.title.toLowerCase().includes(q) ||
        f.contact_person.toLowerCase().includes(q) ||
        f.company.toLowerCase().includes(q) ||
        f.phone.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)

      const eff = effectiveStatus(f)
      const matchStatus =
        filterStatus === 'all' ||
        filterStatus === eff ||
        (filterStatus === 'open' && eff === 'open')

      return matchSearch && matchStatus
    })
  }, [followups, searchTerm, filterStatus])

  // ── Metrics ─────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => ({
    total:     followups.length,
    open:      followups.filter(f => effectiveStatus(f) === 'open').length,
    overdue:   followups.filter(f => isOverdue(f)).length,
    completed: followups.filter(f => f.status === 'completed').length,
  }), [followups])

  // ── Patch local state ────────────────────────────────────────────────────────

  const patchLocal = (id: number, patch: Partial<Followup>) =>
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async (values: FormState) => {
    setSaving(true)
    try {
      const res = await ergonApi.createFollowup({
        ...values,
        followup_type: 'standalone',
        status: 'open',
      })
      const created = res.data?.data ?? res.data
      setFollowups(prev => [created, ...prev])
      toast.success('Follow-up created')
      setCreateOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ||
        Object.values(err?.response?.data || {}).flat().join(', ') ||
        'Failed to create follow-up'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const openEdit = (f: Followup) => {
    setEditingItem(f)
    setEditOpen(true)
  }

  const handleEdit = async (values: FormState) => {
    if (!editingItem) return
    setSaving(true)
    try {
      const res = await ergonApi.updateFollowup(editingItem.id, values)
      const updated = res.data?.data ?? res.data
      patchLocal(editingItem.id, updated)
      toast.success('Follow-up updated')
      setEditOpen(false)
      setEditingItem(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update follow-up')
    } finally {
      setSaving(false)
    }
  }

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = async (f: Followup) => {
    if (!window.confirm(`Mark "${f.title}" as completed?`)) return
    setActionId(f.id)
    try {
      const res = await ergonApi.completeFollowup(String(f.id))
      const updated = res.data?.data ?? res.data
      patchLocal(f.id, updated)
      toast.success('Follow-up marked as completed')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to complete follow-up')
    } finally {
      setActionId(null)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (f: Followup) => {
    if (!window.confirm(`Delete "${f.title}"? This cannot be undone.`)) return
    setActionId(f.id)
    try {
      await ergonApi.deleteFollowup(f.id)
      setFollowups(prev => prev.filter(x => x.id !== f.id))
      toast.success('Follow-up deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete follow-up')
    } finally {
      setActionId(null)
    }
  }

  // ── Edit initial values ──────────────────────────────────────────────────────

  const editInitial: FormState = editingItem
    ? {
        title:          editingItem.title,
        description:    editingItem.description,
        followup_date:  editingItem.followup_date,
        company:        editingItem.company,
        contact_person: editingItem.contact_person,
        phone:          editingItem.phone,
        project_name:   editingItem.project_name,
      }
    : EMPTY_FORM

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Follow-ups</h1>
          </div>
          <p className="text-muted-foreground">Track and manage customer follow-ups and reminders</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Follow-up
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total"     value={metrics.total}     subtitle="All follow-ups"   icon={<Calendar className="h-5 w-5" />} />
        <KPICard title="Open"      value={metrics.open}      subtitle="Active"           icon={<Clock className="h-5 w-5" />}    color="text-yellow-600"
          onClick={() => setFilterStatus('open')} />
        <KPICard title="Overdue"   value={metrics.overdue}   subtitle="Needs attention"  icon={<AlertCircle className="h-5 w-5" />} color="text-red-600"
          onClick={() => setFilterStatus('overdue')} />
        <KPICard title="Completed" value={metrics.completed} subtitle="Finished"         icon={<CheckCircle className="h-5 w-5" />} color="text-green-600"
          onClick={() => setFilterStatus('completed')} />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, contact, company, phone…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
          {(filterStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => { setFilterStatus('all'); setSearchTerm('') }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading follow-ups…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-30" />
            <p className="text-sm">No follow-ups found.</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm mt-1"
            >
              <Plus className="h-4 w-4" />
              New Follow-up
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(f => {
              const eff = effectiveStatus(f)
              const busy = actionId === f.id
              const isDone = f.status === 'completed' || f.status === 'cancelled'

              return (
                <div
                  key={f.id}
                  className={`flex items-start gap-4 p-4 hover:bg-accent/40 transition-colors ${
                    eff === 'overdue' ? 'border-l-4 border-l-red-400' :
                    eff === 'completed' ? 'border-l-4 border-l-green-400' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{f.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(eff)}`}>
                        {eff.charAt(0).toUpperCase() + eff.slice(1)}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-1">
                      {f.contact_person && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {f.contact_person}
                          {f.company && ` · ${f.company}`}
                        </span>
                      )}
                      {f.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {f.phone}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${eff === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(f.followup_date + 'T00:00:00').toLocaleDateString()}
                      </span>
                    </div>

                    {f.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>
                    )}

                    {f.status === 'completed' && f.completed_at && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Completed {new Date(f.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isDone && (
                      <button
                        disabled={busy}
                        onClick={() => handleComplete(f)}
                        className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {busy ? '…' : 'Complete'}
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => openEdit(f)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => handleDelete(f)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <FollowupModal
        open={createOpen}
        mode="create"
        initialValues={EMPTY_FORM}
        loading={saving}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <FollowupModal
        open={editOpen}
        mode="edit"
        initialValues={editInitial}
        loading={saving}
        onClose={() => { setEditOpen(false); setEditingItem(null) }}
        onSubmit={handleEdit}
      />
    </div>
  )
}
