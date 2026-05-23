import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Edit2, MapPin, Plus, Search, Trash2, Truck, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type ResType = 'manpower' | 'machinery'

interface ManpowerRow {
  id: number; name: string; role: string; contact: string
  daily_rate: string | null; status: string; created_at: string
  _type: 'manpower'
}
interface MachineryRow {
  id: number; name: string; type: string; registration_no: string
  daily_rate: string | null; status: string; created_at: string
  _type: 'machinery'
}
type Row = ManpowerRow | MachineryRow

interface FormState {
  resType: ResType
  name: string
  role_or_type: string   // role for manpower, type for machinery
  contact: string        // manpower only
  registration_no: string // machinery only
  daily_rate: string
  status: string
}

const EMPTY: FormState = {
  resType: 'manpower', name: '', role_or_type: '',
  contact: '', registration_no: '', daily_rate: '', status: 'available',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  if (s === 'available') return 'bg-green-100 text-green-800'
  if (s === 'maintenance') return 'bg-red-100 text-red-800'
  if (s === 'deallocated' || s === 'inactive') return 'bg-gray-100 text-gray-600'
  return 'bg-yellow-100 text-yellow-800'
}

function rowLabel(r: Row) {
  return r._type === 'manpower' ? (r as ManpowerRow).role : (r as MachineryRow).type
}

function extractList(data: unknown): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const d = data as any
    if (Array.isArray(d.data)) return d.data
    if (Array.isArray(d.results)) return d.results
  }
  return []
}

// ─── Resource Modal (Create / Edit) ──────────────────────────────────────────

const ResourceModal: React.FC<{
  open: boolean; mode: 'create' | 'edit'; initial: FormState; loading: boolean
  onClose: () => void; onSubmit: (f: FormState) => void
}> = ({ open, mode, initial, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(initial)
  useEffect(() => { if (open) setForm(initial) }, [open, initial])
  if (!open) return null

  const cls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const lbl = 'block text-sm font-medium text-foreground mb-1'
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === 'create' ? 'Allocate Resource' : 'Edit Resource'}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'create' && (
            <div>
              <label className={lbl}>Type *</label>
              <select value={form.resType} onChange={e => set('resType', e.target.value as ResType)} className={cls}>
                <option value="manpower">Manpower</option>
                <option value="machinery">Machinery</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Name *</label>
              <input type="text" required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder={form.resType === 'manpower' ? 'Team / Person name' : 'Equipment name'} className={cls} />
            </div>
            <div>
              <label className={lbl}>{form.resType === 'manpower' ? 'Role' : 'Equipment Type'}</label>
              <input type="text" value={form.role_or_type} onChange={e => set('role_or_type', e.target.value)}
                placeholder={form.resType === 'manpower' ? 'e.g. Electrician' : 'e.g. Excavator'} className={cls} />
            </div>
          </div>
          {form.resType === 'manpower' ? (
            <div>
              <label className={lbl}>Contact</label>
              <input type="text" value={form.contact} onChange={e => set('contact', e.target.value)}
                placeholder="+91 98765 43210" className={cls} />
            </div>
          ) : (
            <div>
              <label className={lbl}>Registration No.</label>
              <input type="text" value={form.registration_no} onChange={e => set('registration_no', e.target.value)}
                placeholder="e.g. JCB-001" className={cls} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Daily Rate (₹)</label>
              <input type="number" min="0" step="0.01" value={form.daily_rate}
                onChange={e => set('daily_rate', e.target.value)} placeholder="0.00" className={cls} />
            </div>
            <div>
              <label className={lbl}>Status *</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={cls}>
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 text-sm font-medium">
              {loading ? 'Saving…' : mode === 'create' ? 'Allocate' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-accent text-foreground rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManpowerMachineryPage() {
  const currentUser = useAuthStore(s => s.user)
  const canManage = useMemo(() => {
    if (!currentUser) return false
    const ut = currentUser.user_type
    const at = (currentUser as any).admin_type
    const rt = (currentUser as any).role_type
    return ut === 'superadmin' || ut === 'masteradmin' ||
      at === 'client' || at === 'epc' || at === 'contractor' || rt === 'admin'
  }, [currentUser])

  const [rows, setRows]         = useState<Row[]>([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [createOpen, setCreateOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<Row | null>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [mpRes, mcRes] = await Promise.all([
        ergonApi.getManpower(),
        ergonApi.getMachinery(),
      ])
      const mp: ManpowerRow[] = extractList(mpRes.data).map((r: any) => ({ ...r, _type: 'manpower' as const }))
      const mc: MachineryRow[] = extractList(mcRes.data).map((r: any) => ({ ...r, _type: 'machinery' as const }))
      setRows([...mp, ...mc].sort((a, b) => b.id - a.id))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtered ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const matchSearch = !q || r.name.toLowerCase().includes(q) || rowLabel(r).toLowerCase().includes(q)
      const matchType   = filterType === 'all' || r._type === filterType
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [rows, search, filterType, filterStatus])

  // ── Metrics ──────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => ({
    manpower:  rows.filter(r => r._type === 'manpower').length,
    machinery: rows.filter(r => r._type === 'machinery').length,
    active:    rows.filter(r => r.status === 'available' || r.status === 'allocated').length,
    totalCost: rows.reduce((s, r) => s + (Number(r.daily_rate) || 0) * 26, 0), // ~26 working days
  }), [rows])

  // ── Patch local ──────────────────────────────────────────────────────────────

  const patchRow = (id: number, type: ResType, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.id === id && r._type === type ? { ...r, ...patch } as Row : r))

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async (form: FormState) => {
    setSaving(true)
    try {
      if (form.resType === 'manpower') {
        const res = await ergonApi.createManpower({
          name: form.name, role: form.role_or_type,
          contact: form.contact, daily_rate: form.daily_rate || null, status: form.status,
        })
        setRows(prev => [{ ...(res.data?.data ?? res.data), _type: 'manpower' as const }, ...prev])
      } else {
        const res = await ergonApi.createMachinery({
          name: form.name, type: form.role_or_type,
          registration_no: form.registration_no, daily_rate: form.daily_rate || null, status: form.status,
        })
        setRows(prev => [{ ...(res.data?.data ?? res.data), _type: 'machinery' as const }, ...prev])
      }
      toast.success('Resource allocated')
      setCreateOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || Object.values(err?.response?.data || {}).flat().join(', ') || 'Failed to allocate')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const editInitial = useMemo((): FormState => {
    if (!editTarget) return EMPTY
    if (editTarget._type === 'manpower') {
      const r = editTarget as ManpowerRow
      return { resType: 'manpower', name: r.name, role_or_type: r.role, contact: r.contact, registration_no: '', daily_rate: r.daily_rate ?? '', status: r.status }
    }
    const r = editTarget as MachineryRow
    return { resType: 'machinery', name: r.name, role_or_type: r.type, contact: '', registration_no: r.registration_no, daily_rate: r.daily_rate ?? '', status: r.status }
  }, [editTarget])

  const handleEdit = async (form: FormState) => {
    if (!editTarget) return
    setSaving(true)
    try {
      if (editTarget._type === 'manpower') {
        const res = await ergonApi.updateManpower(editTarget.id, {
          name: form.name, role: form.role_or_type,
          contact: form.contact, daily_rate: form.daily_rate || null, status: form.status,
        })
        patchRow(editTarget.id, 'manpower', res.data?.data ?? res.data)
      } else {
        const res = await ergonApi.updateMachinery(editTarget.id, {
          name: form.name, type: form.role_or_type,
          registration_no: form.registration_no, daily_rate: form.daily_rate || null, status: form.status,
        })
        patchRow(editTarget.id, 'machinery', res.data?.data ?? res.data)
      }
      toast.success('Resource updated')
      setEditTarget(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  // ── Deallocate (delete) ───────────────────────────────────────────────────────

  const handleDeallocate = async (r: Row) => {
    if (!window.confirm(`Deallocate "${r.name}"? This will remove it from the system.`)) return
    setActionId(`${r._type}-${r.id}`)
    try {
      if (r._type === 'manpower') await ergonApi.deleteManpower(r.id)
      else await ergonApi.deleteMachinery(r.id)
      setRows(prev => prev.filter(x => !(x.id === r.id && x._type === r._type)))
      toast.success('Resource deallocated')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to deallocate')
    } finally {
      setActionId(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const fmt = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toFixed(0)}`

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Manpower & Machinery</h1>
          </div>
          <p className="text-muted-foreground">Resource allocation and utilization tracking</p>
        </div>
        {canManage && (
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
            <Plus className="h-4 w-4" /> Allocate Resource
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { title: 'Manpower',   value: metrics.manpower,  icon: <Users className="h-5 w-5" />,    color: 'text-blue-600' },
          { title: 'Machinery',  value: metrics.machinery, icon: <Truck className="h-5 w-5" />,    color: 'text-purple-600' },
          { title: 'Active',     value: metrics.active,    icon: <Calendar className="h-5 w-5" />, color: 'text-green-600' },
          { title: 'Est. Monthly Cost', value: fmt(metrics.totalCost), icon: <MapPin className="h-5 w-5" />, color: 'text-orange-600' },
        ].map(c => (
          <div key={c.title} className="bg-card border border-border rounded-xl p-3">
            <div className={`p-2 rounded-lg bg-accent ${c.color} w-fit mb-2`}>{c.icon}</div>
            <div className="text-2xl font-bold text-foreground mb-0.5">{c.value}</div>
            <div className="text-xs font-medium text-foreground">{c.title}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search by name, role, type…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Types</option>
            <option value="manpower">Manpower</option>
            <option value="machinery">Machinery</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="allocated">Allocated</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || filterType !== 'all' || filterStatus !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterStatus('all') }}
              className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-accent">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">No resources found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(r => {
              const busy = actionId === `${r._type}-${r.id}`
              return (
                <div key={`${r._type}-${r.id}`} className="flex items-start gap-4 p-4 hover:bg-accent/40 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    {r._type === 'manpower'
                      ? <Users className="h-5 w-5 text-primary" />
                      : <Truck className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{r.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r._type === 'manpower' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {r._type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {rowLabel(r) && <span>{rowLabel(r)}</span>}
                      {r._type === 'manpower' && (r as ManpowerRow).contact && (
                        <span>{(r as ManpowerRow).contact}</span>
                      )}
                      {r._type === 'machinery' && (r as MachineryRow).registration_no && (
                        <span>#{(r as MachineryRow).registration_no}</span>
                      )}
                      {r.daily_rate && <span>₹{Number(r.daily_rate).toLocaleString()}/day</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button disabled={busy} onClick={() => setEditTarget(r)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                        title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button disabled={busy} onClick={() => handleDeallocate(r)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                        title="Deallocate">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ResourceModal open={createOpen} mode="create" initial={EMPTY} loading={saving}
        onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      <ResourceModal open={!!editTarget} mode="edit" initial={editInitial} loading={saving}
        onClose={() => setEditTarget(null)} onSubmit={handleEdit} />
    </div>
  )
}
