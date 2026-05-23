import { useState, useEffect } from 'react'
import { Plus, Search, User, Mail, Phone, MapPin, Calendar, Briefcase, X, Eye, Pencil, Trash2 } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { sanitizePhoneInput, handlePhoneKeyDown, handlePhonePaste } from '../../lib/phoneUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number
  employee_code: string
  full_name: string
  contact_number: string
  department_name: string | null
  designation_name: string | null
  joining_date: string
  status: string
  employment_type: string
  basic_structure: string
  gender: string
}

interface FormState {
  employee_code: string
  full_name: string
  gender: string
  date_of_birth: string
  permanent_address: string
  contact_number: string
  employment_type: string
  wage_type: string
  joining_date: string
  basic_structure: string
}

const EMPTY: FormState = {
  employee_code: '', full_name: '', gender: 'M', date_of_birth: '',
  permanent_address: '', contact_number: '', employment_type: 'permanent',
  wage_type: 'monthly', joining_date: '', basic_structure: '0',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor = (s: string) =>
  s === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'

function parseError(err: any): string {
  const status = err?.response?.status
  const data   = err?.response?.data
  if (status === 403) return 'Permission denied. Ensure Workforce service is enabled.'
  if (data && typeof data === 'object' && !data.detail && !data.error)
    return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
  return data?.detail || data?.error || 'Something went wrong.'
}

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal = ({ emp, onClose }: { emp: Employee; onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
    <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="text-lg font-semibold">Employee Profile</h2>
        <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
      </div>
      <div className="p-5 space-y-3">
        {([
          ['Code',        emp.employee_code],
          ['Name',        emp.full_name],
          ['Gender',      emp.gender === 'M' ? 'Male' : emp.gender === 'F' ? 'Female' : 'Other'],
          ['Contact',     emp.contact_number],
          ['Department',  emp.department_name  || '—'],
          ['Designation', emp.designation_name || '—'],
          ['Type',        emp.employment_type],
          ['Joining',     emp.joining_date],
          ['Salary',      `₹${Number(emp.basic_structure).toLocaleString()}`],
          ['Status',      emp.status],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-muted-foreground w-28 shrink-0">{l}</span>
            <span className="font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end p-5 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Close</button>
      </div>
    </div>
  </div>
)

// ─── Form Modal (Add / Edit) ──────────────────────────────────────────────────

interface FormModalProps {
  initial?: Employee
  onClose: () => void
  onDone: () => void
}

const FormModal = ({ initial, onClose, onDone }: FormModalProps) => {
  const [form, setForm] = useState<FormState>(
    initial
      ? { ...EMPTY, employee_code: initial.employee_code, full_name: initial.full_name,
          gender: initial.gender, contact_number: initial.contact_number,
          employment_type: initial.employment_type, joining_date: initial.joining_date,
          basic_structure: initial.basic_structure }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    // Client-side validation for contact number
    if (form.contact_number && form.contact_number.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      setSaving(false)
      return
    }
    try {
      if (initial) {
        await apiClient.patch(`/api/workforce/employees/${initial.id}/`, form)
      } else {
        await apiClient.post('/api/workforce/employees/', form)
      }
      onDone()
    } catch (err: any) {
      setError(parseError(err))
    } finally {
      setSaving(false)
    }
  }

  const inp = (label: string, key: keyof FormState, type = 'text', req = true) => {
    const isPhone = key === 'contact_number'
    return (
      <div>
        <label className="block text-xs font-medium mb-1">{label}{req && ' *'}</label>
        <input
          type={isPhone ? 'tel' : type}
          required={req}
          value={form[key]}
          onChange={e => {
            if (isPhone) return set(key, sanitizePhoneInput(e.target.value, 10))
            return set(key, e.target.value)
          }}
          onKeyDown={isPhone ? handlePhoneKeyDown : undefined}
          onPaste={isPhone ? (e) => handlePhonePaste(e, 10) : undefined}
          maxLength={isPhone ? 10 : undefined}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{initial ? `Edit — ${initial.full_name}` : 'Add Employee'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {inp('Employee Code',   'employee_code')}
            {inp('Full Name',       'full_name')}
            {inp('Contact Number',  'contact_number', 'text', false)}
            {inp('Date of Birth',   'date_of_birth',  'date', !initial)}
            {inp('Joining Date',    'joining_date',   'date', !initial)}
            {inp('Basic Salary (₹)','basic_structure','number', false)}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Permanent Address{!initial && ' *'}</label>
            <textarea required={!initial} value={form.permanent_address}
              onChange={e => set('permanent_address', e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Gender *</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Employment Type *</label>
              <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="permanent">Permanent</option><option value="contract">Contract</option><option value="temporary">Temporary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Wage Type *</label>
              <select value={form.wage_type} onChange={e => set('wage_type', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="monthly">Monthly</option><option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : initial ? 'Update' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfileManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [showAdd,  setShowAdd]  = useState(false)
  const [viewing,  setViewing]  = useState<Employee | null>(null)
  const [editing,  setEditing]  = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    apiClient.get('/api/workforce/employees/')
      .then(res => {
        const list: Employee[] = Array.isArray(res.data?.data) ? res.data.data
          : Array.isArray(res.data) ? res.data : []
        setEmployees(list)
      })
      .catch(err => setPageError(parseError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this employee?')) return
    setDeleting(id)
    try {
      await apiClient.delete(`/api/workforce/employees/${id}/`)
      setEmployees(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      alert(parseError(err))
    } finally {
      setDeleting(null)
    }
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const metrics = {
    total:     employees.length,
    active:    employees.filter(e => e.status === 'active').length,
    permanent: employees.filter(e => e.employment_type === 'permanent').length,
  }

  return (
    <div className="p-6 space-y-6">
      {showAdd  && <FormModal onClose={() => setShowAdd(false)}  onDone={() => { setShowAdd(false);  load() }} />}
      {editing  && <FormModal initial={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} />}
      {viewing  && <ViewModal emp={viewing} onClose={() => setViewing(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Profile Management</h1>
          </div>
          <p className="text-muted-foreground">Manage employee profiles and information</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',     val: metrics.total,     icon: <User className="h-5 w-5" /> },
          { label: 'Active',    val: metrics.active,    icon: <Briefcase className="h-5 w-5" />, color: 'text-green-600' },
          { label: 'Permanent', val: metrics.permanent, icon: <Calendar className="h-5 w-5" />, color: 'text-blue-600' },
        ].map(({ label, val, icon, color = 'text-primary' }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className={`p-2 rounded-lg bg-accent ${color} w-fit mb-2`}>{icon}</div>
            <div className="text-2xl font-bold">{val}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 flex-wrap mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="Search by name or code..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : pageError ? (
          <div className="text-center py-12 text-red-500">{pageError}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {employees.length === 0 ? 'No employees yet. Click "Add Employee" to get started.' : 'No results match your search.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(emp => (
              <div key={emp.id} className="flex items-center gap-4 p-4 bg-accent/50 rounded-xl hover:bg-accent">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{emp.full_name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{emp.employee_code}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(emp.status)}`}>{emp.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{emp.designation_name || '—'} · {emp.department_name || '—'}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{emp.contact_number || '—'}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined: {emp.joining_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewing(emp)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs">
                    <Eye className="h-3 w-3" />View
                  </button>
                  <button onClick={() => setEditing(emp)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 text-xs">
                    <Pencil className="h-3 w-3" />Edit
                  </button>
                  <button onClick={() => handleDelete(emp.id)} disabled={deleting === emp.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs disabled:opacity-50">
                    <Trash2 className="h-3 w-3" />{deleting === emp.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
