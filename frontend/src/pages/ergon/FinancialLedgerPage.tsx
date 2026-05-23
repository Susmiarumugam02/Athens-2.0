import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileText, Plus, Search, TrendingDown, TrendingUp, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: number
  entry_type: 'debit' | 'credit'
  category: string
  amount: string
  description: string
  entry_date: string
  reference_no: string
  project: number | null
  project_name?: string   // from serializer if available
  created_at: string
}

interface FormState {
  entry_type: 'debit' | 'credit'
  category: string
  amount: string
  description: string
  entry_date: string
  reference_no: string
}

const EMPTY: FormState = {
  entry_type: 'credit', category: 'Revenue',
  amount: '', description: '', entry_date: new Date().toISOString().split('T')[0], reference_no: '',
}

const CATEGORIES = ['Revenue', 'Materials', 'Labor', 'Equipment', 'Transport', 'Miscellaneous']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(data: unknown): LedgerEntry[] {
  if (Array.isArray(data)) return data as LedgerEntry[]
  if (data && typeof data === 'object') {
    const d = data as any
    if (Array.isArray(d.data)) return d.data
    if (Array.isArray(d.results)) return d.results
  }
  return []
}

function fmt(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────

const AddEntryModal: React.FC<{
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
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    if (!form.description.trim()) { toast.error('Description is required'); return }
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Ledger Entry</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Type *</label>
              <select value={form.entry_type} onChange={e => set('entry_type', e.target.value as any)} className={cls}>
                <option value="credit">Credit (Income)</option>
                <option value="debit">Debit (Expense)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={cls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Amount (₹) *</label>
              <input type="number" min="0.01" step="0.01" required value={form.amount}
                onChange={e => set('amount', e.target.value)} placeholder="0.00" className={cls} />
            </div>
            <div>
              <label className={lbl}>Date *</label>
              <input type="date" required value={form.entry_date}
                onChange={e => set('entry_date', e.target.value)} className={cls} />
            </div>
          </div>
          <div>
            <label className={lbl}>Reference No.</label>
            <input type="text" value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
              placeholder="e.g. INV-2025-001" className={cls} />
          </div>
          <div>
            <label className={lbl}>Description *</label>
            <textarea rows={2} required value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Transaction details" className={cls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 text-sm font-medium">
              {loading ? 'Saving…' : 'Add Entry'}
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

export default function FinancialLedgerPage() {
  const currentUser = useAuthStore(s => s.user)
  const canWrite = useMemo(() => {
    if (!currentUser) return false
    const ut = currentUser.user_type
    const at = (currentUser as any).admin_type
    const rt = (currentUser as any).role_type
    return ut === 'superadmin' || ut === 'masteradmin' ||
      at === 'client' || at === 'epc' || at === 'contractor' || rt === 'admin'
  }, [currentUser])

  const [entries, setEntries]   = useState<LedgerEntry[]>([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [exporting, setExporting] = useState(false)
  const [addOpen, setAddOpen]   = useState(false)

  const [search, setSearch]               = useState('')
  const [filterType, setFilterType]       = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ergonApi.getLedgerEntries()
      setEntries(extractList(res.data))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load ledger')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── Client-side filter ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries.filter(e => {
      const matchSearch = !q ||
        e.description.toLowerCase().includes(q) ||
        e.reference_no.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        String(e.amount).includes(q)
      const matchType     = filterType === 'all' || e.entry_type === filterType
      const matchCategory = filterCategory === 'all' || e.category.toLowerCase() === filterCategory.toLowerCase()
      return matchSearch && matchType && matchCategory
    })
  }, [entries, search, filterType, filterCategory])

  // ── Running balance (chronological order already from backend) ───────────────

  const withBalance = useMemo(() => {
    let running = 0
    return filtered.map(e => {
      const amt = Number(e.amount)
      running += e.entry_type === 'credit' ? amt : -amt
      return { ...e, running }
    })
  }, [filtered])

  // ── Metrics ──────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const credit = filtered.filter(e => e.entry_type === 'credit').reduce((s, e) => s + Number(e.amount), 0)
    const debit  = filtered.filter(e => e.entry_type === 'debit').reduce((s, e) => s + Number(e.amount), 0)
    return { credit, debit, net: credit - debit, count: filtered.length }
  }, [filtered])

  // ── Unique categories from data ───────────────────────────────────────────────

  const categories = useMemo(() =>
    [...new Set(entries.map(e => e.category))].sort()
  , [entries])

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async (form: FormState) => {
    setSaving(true)
    try {
      const res = await ergonApi.createLedgerEntry({
        entry_type: form.entry_type,
        category: form.category,
        amount: form.amount,
        description: form.description,
        entry_date: form.entry_date,
        reference_no: form.reference_no,
      })
      const created = res.data?.data ?? res.data
      setEntries(prev => [...prev, created].sort((a, b) =>
        a.entry_date.localeCompare(b.entry_date) || a.id - b.id
      ))
      toast.success('Entry added')
      setAddOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ||
        Object.values(err?.response?.data || {}).flat().join(', ') || 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (withBalance.length === 0) { toast.error('No data to export'); return }
    setExporting(true)
    try {
      const header = ['Date', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']
      const rows = withBalance.map(e => [
        e.entry_date,
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        e.reference_no,
        e.entry_type === 'debit'  ? Number(e.amount).toFixed(2) : '',
        e.entry_type === 'credit' ? Number(e.amount).toFixed(2) : '',
        e.running.toFixed(2),
      ])
      const totalsRow = ['', '', 'TOTALS', '',
        metrics.debit.toFixed(2), metrics.credit.toFixed(2), metrics.net.toFixed(2)]
      const csv = [header, ...rows, totalsRow].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported successfully')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Financial Ledger</h1>
          </div>
          <p className="text-muted-foreground">Project-wise accounting and transaction history</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground border border-border rounded-lg hover:bg-accent/80 disabled:opacity-50 text-sm font-medium">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {canWrite && (
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
              <Plus className="h-4 w-4" /> Add Entry
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { title: 'Total Credit', value: fmt(metrics.credit), icon: <TrendingUp className="h-5 w-5" />,   color: 'text-green-600', sub: 'Income' },
          { title: 'Total Debit',  value: fmt(metrics.debit),  icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-600',   sub: 'Expenses' },
          { title: 'Net Balance',  value: fmt(Math.abs(metrics.net)),
            icon: <FileText className="h-5 w-5" />,
            color: metrics.net >= 0 ? 'text-green-600' : 'text-red-600',
            sub: metrics.net >= 0 ? 'Surplus' : 'Deficit' },
          { title: 'Transactions', value: metrics.count, icon: <FileText className="h-5 w-5" />, color: 'text-primary', sub: 'Entries' },
        ].map(c => (
          <div key={c.title} className="bg-card border border-border rounded-xl p-3">
            <div className={`p-2 rounded-lg bg-accent ${c.color} w-fit mb-2`}>{c.icon}</div>
            <div className="text-2xl font-bold text-foreground mb-0.5">{c.value}</div>
            <div className="text-xs font-medium text-foreground">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search description, reference, category…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || filterType !== 'all' || filterCategory !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterCategory('all') }}
              className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-accent">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : withBalance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">No ledger entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr>
                  {['Date', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'].map(h => (
                    <th key={h} className={`px-4 py-3 font-semibold text-foreground ${['Debit','Credit','Balance'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withBalance.map(e => (
                  <tr key={e.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{e.entry_date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-accent text-foreground rounded text-xs">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{e.description}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.reference_no || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {e.entry_type === 'debit'
                        ? <span className="text-red-600 font-semibold">₹{Number(e.amount).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.entry_type === 'credit'
                        ? <span className="text-green-600 font-semibold">₹{Number(e.amount).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${e.running >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                        ₹{e.running.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-accent border-t-2 border-primary">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-foreground">Totals</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600 font-bold">₹{metrics.debit.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-600 font-bold">₹{metrics.credit.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-base ${metrics.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{metrics.net.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <AddEntryModal open={addOpen} loading={saving} onClose={() => setAddOpen(false)} onSubmit={handleCreate} />
    </div>
  )
}
