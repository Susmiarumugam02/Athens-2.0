import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Clock, DollarSign, FileText, Plus, Search, TrendingDown, TrendingUp, X, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordType = 'advance' | 'expense'

interface AdvanceRecord {
  id: number
  amount: string
  purpose: string
  status: string
  requested_date: string
  approved_date: string | null
  rejection_reason: string
  employee_name: string
  approved_by_name: string | null
  _type: 'advance'
}

interface ExpenseRecord {
  id: number
  amount: string
  description: string
  category: string
  expense_date: string
  status: string
  rejection_reason: string
  employee_name: string
  approved_by_name: string | null
  _type: 'expense'
}

type Row = AdvanceRecord | ExpenseRecord

interface FormState {
  reqType: RecordType
  amount: string
  purpose: string
  category: string
  expense_date: string
}

const EMPTY: FormState = { reqType: 'expense', amount: '', purpose: '', category: 'Other', expense_date: new Date().toISOString().split('T')[0] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  if (s === 'approved') return 'bg-green-100 text-green-800'
  if (s === 'rejected') return 'bg-red-100 text-red-800'
  return 'bg-yellow-100 text-yellow-800'
}

function label(r: Row) { return r._type === 'advance' ? (r as AdvanceRecord).purpose : (r as ExpenseRecord).description }
function date(r: Row)  { return r._type === 'advance' ? (r as AdvanceRecord).requested_date : (r as ExpenseRecord).expense_date }
function cat(r: Row)   { return r._type === 'advance' ? 'Advance' : (r as ExpenseRecord).category }

function extractList(data: unknown): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const d = data as any
    if (Array.isArray(d.data)) return d.data
    if (Array.isArray(d.results)) return d.results
  }
  return []
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
  open: boolean; loading: boolean
  onClose: () => void; onConfirm: (reason: string) => void
}> = ({ open, loading, onClose, onConfirm }) => {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Reject Request</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (required)"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <div className="flex gap-3">
          <button disabled={!reason.trim() || loading} onClick={() => onConfirm(reason)}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
            {loading ? 'Rejecting…' : 'Reject'}
          </button>
          <button onClick={onClose} className="flex-1 py-2 bg-accent text-foreground rounded-lg text-sm font-medium">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── New Request Modal ────────────────────────────────────────────────────────

const RequestModal: React.FC<{
  open: boolean; loading: boolean
  onClose: () => void; onSubmit: (f: FormState) => void
}> = ({ open, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(EMPTY)
  useEffect(() => { if (open) setForm(EMPTY) }, [open])
  if (!open) return null
  const cls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const lbl = 'block text-sm font-medium text-foreground mb-1'
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.purpose.trim()) { toast.error('Description is required'); return }
    onSubmit(form)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">New Request</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Type *</label>
              <select value={form.reqType} onChange={e => set('reqType', e.target.value as RecordType)} className={cls}>
                <option value="expense">Expense</option>
                <option value="advance">Advance</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Amount (₹) *</label>
              <input type="number" min="1" step="0.01" required value={form.amount}
                onChange={e => set('amount', e.target.value)} placeholder="0.00" className={cls} />
            </div>
          </div>
          {form.reqType === 'expense' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className={cls}>
                  {['Materials','Transport','Equipment','Labor','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Date *</label>
                <input type="date" required value={form.expense_date} onChange={e => set('expense_date', e.target.value)} className={cls} />
              </div>
            </div>
          )}
          <div>
            <label className={lbl}>Description *</label>
            <textarea rows={3} required value={form.purpose} onChange={e => set('purpose', e.target.value)}
              placeholder="What is this for?" className={cls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 text-sm font-medium">
              {loading ? 'Submitting…' : 'Submit Request'}
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

export default function AdvanceExpensesPage() {
  const currentUser = useAuthStore(s => s.user)
  // Only admins and above can approve/reject — regular project users cannot
  const canApprove = useMemo(() => {
    if (!currentUser) return false
    const ut = currentUser.user_type
    const at = (currentUser as any).admin_type
    const rt = (currentUser as any).role_type
    return (
      ut === 'superadmin' ||
      ut === 'masteradmin' ||
      at === 'client' || at === 'epc' || at === 'contractor' ||
      rt === 'admin'
    )
  }, [currentUser])
  const [rows, setRows]           = useState<Row[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [actionId, setActionId]   = useState<string | null>(null)

  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [createOpen, setCreateOpen]   = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null)
  const [rejectLoading, setRejectLoading] = useState(false)

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [advRes, expRes] = await Promise.all([
        ergonApi.getAdvances(),
        ergonApi.getExpenses(),
      ])
      const advances: AdvanceRecord[] = extractList(advRes.data).map((a: any) => ({ ...a, _type: 'advance' as const }))
      const expenses: ExpenseRecord[] = extractList(expRes.data).map((e: any) => ({ ...e, _type: 'expense' as const }))
      setRows([...advances, ...expenses].sort((a, b) => b.id - a.id))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(r => {
      const matchSearch = !q ||
        label(r).toLowerCase().includes(q) ||
        r.employee_name.toLowerCase().includes(q) ||
        cat(r).toLowerCase().includes(q)
      const matchType   = filterType === 'all' || r._type === filterType
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [rows, search, filterType, filterStatus])

  // ── Metrics ──────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const advances = rows.filter(r => r._type === 'advance')
    const expenses = rows.filter(r => r._type === 'expense')
    return {
      totalAdv: advances.reduce((s, r) => s + Number(r.amount), 0),
      totalExp: expenses.reduce((s, r) => s + Number(r.amount), 0),
      pending:  rows.filter(r => r.status === 'pending').length,
      approved: rows.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.amount), 0),
    }
  }, [rows])

  // ── Patch local ──────────────────────────────────────────────────────────────

  const patchRow = (id: number, type: RecordType, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r.id === id && r._type === type ? { ...r, ...patch } as Row : r))

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async (form: FormState) => {
    setSaving(true)
    try {
      if (form.reqType === 'advance') {
        const res = await ergonApi.createAdvance({ amount: form.amount, purpose: form.purpose })
        const created = { ...(res.data?.data ?? res.data), _type: 'advance' as const }
        setRows(prev => [created, ...prev])
      } else {
        const res = await ergonApi.createExpense({
          amount: form.amount, description: form.purpose,
          category: form.category, expense_date: form.expense_date,
        })
        const created = { ...(res.data?.data ?? res.data), _type: 'expense' as const }
        setRows(prev => [created, ...prev])
      }
      toast.success('Request submitted')
      setCreateOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ||
        Object.values(err?.response?.data || {}).flat().join(', ') || 'Failed to submit'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Approve ──────────────────────────────────────────────────────────────────

  const handleApprove = async (r: Row) => {
    if (!window.confirm(`Approve this ${r._type} request of ₹${Number(r.amount).toLocaleString()}?`)) return
    setActionId(`${r._type}-${r.id}`)
    try {
      const res = r._type === 'advance'
        ? await ergonApi.approveAdvance(r.id)
        : await ergonApi.approveExpense(r.id)
      patchRow(r.id, r._type, res.data?.data ?? res.data)
      toast.success('Request approved')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to approve')
    } finally {
      setActionId(null)
    }
  }

  // ── Reject ───────────────────────────────────────────────────────────────────

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return
    setRejectLoading(true)
    try {
      const res = rejectTarget._type === 'advance'
        ? await ergonApi.rejectAdvance(rejectTarget.id, reason)
        : await ergonApi.rejectExpense(rejectTarget.id, reason)
      patchRow(rejectTarget.id, rejectTarget._type, res.data?.data ?? res.data)
      toast.success('Request rejected')
      setRejectTarget(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reject')
    } finally {
      setRejectLoading(false)
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
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Advance & Expenses</h1>
          </div>
          <p className="text-muted-foreground">Manage advances and expense claims with approval workflow</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { title: 'Total Advances', value: fmt(metrics.totalAdv), icon: <TrendingUp className="h-5 w-5" />, color: 'text-blue-600' },
          { title: 'Total Expenses', value: fmt(metrics.totalExp), icon: <TrendingDown className="h-5 w-5" />, color: 'text-purple-600' },
          { title: 'Pending',        value: metrics.pending,       icon: <Clock className="h-5 w-5" />,       color: 'text-yellow-600' },
          { title: 'Approved Total', value: fmt(metrics.approved), icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600' },
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
            <input type="text" placeholder="Search by description, employee, category…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Types</option>
            <option value="advance">Advance</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">No records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(r => {
              const busy = actionId === `${r._type}-${r.id}`
              const isPending = r.status === 'pending'
              return (
                <div key={`${r._type}-${r.id}`} className="flex items-start gap-4 p-4 hover:bg-accent/40 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">{label(r)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r._type === 'advance' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {r._type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{cat(r)}</span>
                      <span>{r.employee_name}</span>
                      <span>{date(r)}</span>
                      {r.approved_by_name && <span>By: {r.approved_by_name}</span>}
                    </div>
                    {r.rejection_reason && (
                      <p className="text-xs text-red-600 mt-0.5">Reason: {r.rejection_reason}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">₹{Number(r.amount).toLocaleString()}</p>
                    {isPending && canApprove && (
                      <div className="flex gap-1.5 mt-2 justify-end">
                        <button disabled={busy} onClick={() => handleApprove(r)}
                          className="px-2.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />{busy ? '…' : 'Approve'}
                        </button>
                        <button disabled={busy} onClick={() => setRejectTarget(r)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RequestModal open={createOpen} loading={saving} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      <RejectModal open={!!rejectTarget} loading={rejectLoading} onClose={() => setRejectTarget(null)} onConfirm={handleRejectConfirm} />
    </div>
  )
}
