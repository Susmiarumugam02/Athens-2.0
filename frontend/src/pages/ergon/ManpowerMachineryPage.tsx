import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Filter,
  Fuel,
  HardHat,
  IndianRupee,
  MapPin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'
import { useAuthStore } from '../../store/authStore'

type ResourceType = 'manpower' | 'machinery'
type TabKey = 'manpower' | 'machinery' | 'allocation' | 'utilization' | 'maintenance' | 'expenses'
type SortKey = 'name' | 'site' | 'status' | 'rate'

interface ManpowerRow {
  id: number
  name: string
  role: string
  skill_type?: string
  contact?: string
  daily_rate: string | null
  assigned_site?: string
  status: string
  availability?: string
  shift?: string
  notes?: string
  created_at?: string
  _type: 'manpower'
}

interface MachineryRow {
  id: number
  name: string
  type: string
  registration_no?: string
  daily_rate: string | null
  status: string
  quantity?: number
  fuel_usage?: string
  working_hours?: string
  assigned_site?: string
  operator_name?: string
  condition?: string
  maintenance_status?: string
  notes?: string
  created_at?: string
  _type: 'machinery'
}

type ResourceRow = ManpowerRow | MachineryRow

interface AllocationRow {
  id: number
  resource_type: ResourceType
  resource_id: number
  site_name: string
  assigned_from?: string
  assigned_to?: string
  status: string
  remarks?: string
}

interface ResourceForm {
  resource_type: ResourceType
  name: string
  category: string
  role: string
  skill_type: string
  contact: string
  daily_rate: string
  shift: string
  assigned_site: string
  start_date: string
  end_date: string
  status: string
  availability: string
  quantity: string
  fuel_usage: string
  working_hours: string
  operator_name: string
  condition: string
  maintenance_status: string
  notes: string
}

const PAGE_SIZE = 8
const MACHINE_TYPES = ['Hydra', 'JCB', 'Crane', 'DG Generator', 'Excavator', 'Tata Ace', 'Boom Lift', 'Welding Machine', 'Compressor']
const ROLES = ['Electrician', 'Fitter', 'Welder', 'Supervisor', 'Helper', 'Safety Steward', 'Operator', 'Technician']
const SHIFTS = ['General', 'Day', 'Night', 'Double Shift']
const SITES = ['BKC Site', 'Solar Block A', 'Main Yard', 'Warehouse', 'Client Site', 'Fabrication Zone']

const EMPTY_FORM: ResourceForm = {
  resource_type: 'manpower',
  name: '',
  category: 'Electrician',
  role: 'Electrician',
  skill_type: 'Skilled',
  contact: '',
  daily_rate: '',
  shift: 'General',
  assigned_site: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  status: 'available',
  availability: 'available',
  quantity: '1',
  fuel_usage: '0',
  working_hours: '0',
  operator_name: '',
  condition: 'Good',
  maintenance_status: 'active',
  notes: '',
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

function extractOne(data: unknown): any {
  if (data && typeof data === 'object' && 'data' in (data as any)) return (data as any).data
  return data
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function rate(row: ResourceRow) {
  return Number(row.daily_rate || 0)
}

function site(row: ResourceRow) {
  return row.assigned_site || 'Unassigned'
}

function statusClasses(status: string) {
  const s = (status || '').toLowerCase()
  if (['available', 'active', 'good'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (['assigned', 'allocated'].includes(s)) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (['maintenance', 'service due'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (['inactive', 'breakdown', 'on leave'].includes(s)) return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

function canManageResource(user: any) {
  if (!user) return false
  return user.user_type === 'superadmin' || user.user_type === 'masteradmin' ||
    user.admin_type === 'client' || user.admin_type === 'epc' || user.admin_type === 'contractor' || user.role_type === 'admin'
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function KpiCard({ title, value, helper, trend, icon: Icon, tone }: {
  title: string
  value: string | number
  helper: string
  trend: string
  icon: any
  tone: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{trend}</span>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function Badge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${statusClasses(status)}`}>{status || 'available'}</span>
}

function ResourceDrawer({ open, initial, saving, onClose, onSubmit }: {
  open: boolean
  initial: ResourceForm
  saving: boolean
  onClose: () => void
  onSubmit: (form: ResourceForm) => void
}) {
  const [form, setForm] = useState<ResourceForm>(initial)
  useEffect(() => { if (open) setForm(initial) }, [initial, open])
  if (!open) return null

  const set = (key: keyof ResourceForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('Resource name is required')
      return
    }
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Allocate Resource</h2>
            <p className="text-sm text-muted-foreground">Create resource master data and site allocation details in one workflow.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Type">
              <select value={form.resource_type} onChange={(event) => set('resource_type', event.target.value as ResourceType)} className="athens-input">
                <option value="manpower">Manpower</option>
                <option value="machinery">Machinery</option>
              </select>
            </Field>
            <Field label="Resource Name">
              <input value={form.name} onChange={(event) => set('name', event.target.value)} className="athens-input" placeholder={form.resource_type === 'manpower' ? 'Employee name' : 'Machine name'} />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(event) => set('category', event.target.value)} className="athens-input">
                {(form.resource_type === 'manpower' ? ROLES : MACHINE_TYPES).map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Role">
              <input value={form.role} onChange={(event) => set('role', event.target.value)} className="athens-input" placeholder="Role or operator function" />
            </Field>
            {form.resource_type === 'manpower' ? (
              <>
                <Field label="Skill Type">
                  <select value={form.skill_type} onChange={(event) => set('skill_type', event.target.value)} className="athens-input">
                    <option>Skilled</option>
                    <option>Semi-skilled</option>
                    <option>Unskilled</option>
                    <option>Supervisor</option>
                  </select>
                </Field>
                <Field label="Contact">
                  <input value={form.contact} onChange={(event) => set('contact', event.target.value)} className="athens-input" placeholder="+91 98765 43210" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Quantity">
                  <input type="number" min="1" value={form.quantity} onChange={(event) => set('quantity', event.target.value)} className="athens-input" />
                </Field>
                <Field label="Operator">
                  <input value={form.operator_name} onChange={(event) => set('operator_name', event.target.value)} className="athens-input" placeholder="Operator name" />
                </Field>
                <Field label="Fuel Usage">
                  <input type="number" min="0" step="0.01" value={form.fuel_usage} onChange={(event) => set('fuel_usage', event.target.value)} className="athens-input" placeholder="Litres/day" />
                </Field>
                <Field label="Working Hours">
                  <input type="number" min="0" step="0.01" value={form.working_hours} onChange={(event) => set('working_hours', event.target.value)} className="athens-input" placeholder="Hours/day" />
                </Field>
                <Field label="Condition">
                  <select value={form.condition} onChange={(event) => set('condition', event.target.value)} className="athens-input">
                    <option>Good</option>
                    <option>Service Due</option>
                    <option>Breakdown</option>
                  </select>
                </Field>
                <Field label="Maintenance Status">
                  <select value={form.maintenance_status} onChange={(event) => set('maintenance_status', event.target.value)} className="athens-input">
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="breakdown">Breakdown</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Daily Rate">
              <input type="number" min="0" step="0.01" value={form.daily_rate} onChange={(event) => set('daily_rate', event.target.value)} className="athens-input" placeholder="0.00" />
            </Field>
            <Field label="Shift">
              <select value={form.shift} onChange={(event) => set('shift', event.target.value)} className="athens-input">
                {SHIFTS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Site Assignment">
              <select value={form.assigned_site} onChange={(event) => set('assigned_site', event.target.value)} className="athens-input">
                <option value="">Unassigned</option>
                {SITES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={(event) => set('start_date', event.target.value)} className="athens-input" />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date} onChange={(event) => set('end_date', event.target.value)} className="athens-input" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(event) => set('status', event.target.value)} className="athens-input">
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="on leave">On Leave</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Availability">
              <select value={form.availability} onChange={(event) => set('availability', event.target.value)} className="athens-input">
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="on leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <textarea rows={3} value={form.notes} onChange={(event) => set('notes', event.target.value)} className="athens-input" placeholder="Allocation, productivity, attendance, payroll, or safety notes" />
            </Field>
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card p-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

function ResourceTable({ type, rows, page, setPage, canManage, onEdit }: {
  type: ResourceType
  rows: ResourceRow[]
  page: number
  setPage: (page: number) => void
  canManage: boolean
  onEdit: (row: ResourceRow) => void
}) {
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, setPage, totalPages])

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-border bg-accent/50 text-xs uppercase text-muted-foreground">
              {type === 'manpower' ? (
                <tr>
                  {['Employee Name', 'Role', 'Skill Type', 'Contact', 'Daily Rate', 'Assigned Site', 'Status', 'Availability', 'Shift', 'Actions'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}
                </tr>
              ) : (
                <tr>
                  {['Machine Name', 'Category', 'Quantity', 'Fuel Usage', 'Working Hours', 'Site Assigned', 'Operator', 'Condition', 'Maintenance Status', 'Actions'].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((row) => (
                <tr key={`${row._type}-${row.id}`} className="hover:bg-accent/30">
                  {row._type === 'manpower' ? (
                    <>
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.role}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.skill_type || 'Skilled'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.contact || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{money(rate(row))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{site(row)}</td>
                      <td className="px-4 py-3"><Badge status={row.status} /></td>
                      <td className="px-4 py-3"><Badge status={row.availability || row.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{row.shift || 'General'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.quantity || 1}</td>
                      <td className="px-4 py-3 text-muted-foreground">{Number(row.fuel_usage || 0).toLocaleString()} L</td>
                      <td className="px-4 py-3 text-muted-foreground">{Number(row.working_hours || 0).toLocaleString()} h</td>
                      <td className="px-4 py-3 text-muted-foreground">{site(row)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.operator_name || '-'}</td>
                      <td className="px-4 py-3"><Badge status={row.condition || 'Good'} /></td>
                      <td className="px-4 py-3"><Badge status={row.maintenance_status || row.status} /></td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {canManage && <button type="button" onClick={() => onEdit(row)} className="rounded border border-border p-2 text-muted-foreground hover:bg-accent" title="Edit"><Edit2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 && <EmptyState />}
      </div>

      <div className="grid gap-3 lg:hidden">
        {pageRows.map((row) => (
          <div key={`${row._type}-${row.id}`} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-sm text-muted-foreground">{row._type === 'manpower' ? row.role : row.type}</p>
              </div>
              <Badge status={row.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <span>{site(row)}</span>
              <span>{money(rate(row))}/day</span>
              <span>{row._type === 'manpower' ? row.shift || 'General' : `${Number(row.working_hours || 0)} h`}</span>
              <span>{row._type === 'manpower' ? row.availability || row.status : row.maintenance_status || row.status}</span>
            </div>
            {canManage && <button type="button" onClick={() => onEdit(row)} className="mt-4 rounded border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">Edit</button>}
          </div>
        ))}
        {pageRows.length === 0 && <EmptyState />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        <span>Showing {pageRows.length} of {rows.length} records</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border border-border p-2 hover:bg-accent disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded border border-border p-2 hover:bg-accent disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card py-12 text-muted-foreground">
      <Users className="h-8 w-8 opacity-50" />
      <p className="text-sm">No resources match the current filters.</p>
    </div>
  )
}

function MiniBar({ label, value, max, helper }: { label: string; value: number; max: number; helper: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{helper}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-accent">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%` }} />
      </div>
    </div>
  )
}

export default function ManpowerMachineryPage() {
  const currentUser = useAuthStore((state) => state.user)
  const canManage = canManageResource(currentUser)
  const [manpower, setManpower] = useState<ManpowerRow[]>([])
  const [machinery, setMachinery] = useState<MachineryRow[]>([])
  const [allocations, setAllocations] = useState<AllocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('manpower')
  const [query, setQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ResourceRow | null>(null)
  const [createType, setCreateType] = useState<ResourceType>('manpower')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [mpRes, mcRes, allocRes] = await Promise.all([
        ergonApi.getManpower(),
        ergonApi.getMachinery(),
        ergonApi.getResourceAllocations().catch(() => ({ data: [] })),
      ])
      setManpower(extractList(mpRes.data).map((row: any) => ({ ...row, _type: 'manpower' as const })))
      setMachinery(extractList(mcRes.data).map((row: any) => ({ ...row, _type: 'machinery' as const })))
      setAllocations(extractList((allocRes as any).data))
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const allRows: ResourceRow[] = useMemo(() => [...manpower, ...machinery], [machinery, manpower])
  const monthlyCost = allRows.reduce((sum, row) => sum + rate(row) * 26, 0)
  const assigned = allRows.filter((row) => ['assigned', 'allocated'].includes(row.status) || !!row.assigned_site).length
  const available = allRows.filter((row) => ['available', 'active'].includes((row.availability || row.status || '').toLowerCase()) && !row.assigned_site).length
  const activeMachinery = machinery.filter((row) => !['inactive', 'breakdown'].includes((row.status || '').toLowerCase())).length
  const utilization = allRows.length ? Math.round((assigned / allRows.length) * 100) : 0

  const siteStats = useMemo(() => {
    const sites = new Map<string, { manpower: number; machinery: number; cost: number; fuel: number }>()
    allRows.forEach((row) => {
      const key = site(row)
      if (key === 'Unassigned') return
      const current = sites.get(key) || { manpower: 0, machinery: 0, cost: 0, fuel: 0 }
      if (row._type === 'manpower') current.manpower += 1
      else {
        current.machinery += row.quantity || 1
        current.fuel += Number(row.fuel_usage || 0)
      }
      current.cost += rate(row)
      sites.set(key, current)
    })
    return Array.from(sites.entries()).map(([name, stat]) => ({ name, ...stat, utilization: Math.min(95, Math.round(((stat.manpower + stat.machinery) / Math.max(allRows.length, 1)) * 100) + 35) }))
  }, [allRows])

  const currentRows = activeTab === 'machinery' ? machinery : manpower
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = [...currentRows].filter((row) => {
      const text = row._type === 'manpower'
        ? [row.name, row.role, row.skill_type, row.contact, row.assigned_site, row.status, row.shift].join(' ')
        : [row.name, row.type, row.operator_name, row.assigned_site, row.status, row.maintenance_status, row.condition].join(' ')
      const role = row._type === 'manpower' ? row.role : row.type
      return (!q || text.toLowerCase().includes(q)) &&
        (siteFilter === 'all' || site(row) === siteFilter) &&
        (roleFilter === 'all' || role === roleFilter) &&
        (statusFilter === 'all' || row.status === statusFilter || (row._type === 'machinery' && row.maintenance_status === statusFilter)) &&
        (shiftFilter === 'all' || (row._type === 'manpower' && (row.shift || 'General') === shiftFilter))
    })
    rows.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1
      const value = (row: ResourceRow) => {
        if (sortKey === 'site') return site(row)
        if (sortKey === 'status') return row.status
        if (sortKey === 'rate') return rate(row)
        return row.name
      }
      return value(a) > value(b) ? direction : -direction
    })
    return rows
  }, [currentRows, query, roleFilter, shiftFilter, siteFilter, sortDir, sortKey, statusFilter])

  const formInitial = useMemo<ResourceForm>(() => {
    if (!editTarget) return { ...EMPTY_FORM, resource_type: createType, category: createType === 'machinery' ? 'JCB' : 'Electrician', role: createType === 'machinery' ? 'JCB' : 'Electrician' }
    if (editTarget._type === 'manpower') {
      return {
        ...EMPTY_FORM,
        resource_type: 'manpower',
        name: editTarget.name,
        category: editTarget.role || 'Electrician',
        role: editTarget.role || '',
        skill_type: editTarget.skill_type || 'Skilled',
        contact: editTarget.contact || '',
        daily_rate: editTarget.daily_rate || '',
        shift: editTarget.shift || 'General',
        assigned_site: editTarget.assigned_site || '',
        status: editTarget.status || 'available',
        availability: editTarget.availability || editTarget.status || 'available',
        notes: editTarget.notes || '',
      }
    }
    return {
      ...EMPTY_FORM,
      resource_type: 'machinery',
      name: editTarget.name,
      category: editTarget.type || 'JCB',
      role: editTarget.type || '',
      daily_rate: editTarget.daily_rate || '',
      assigned_site: editTarget.assigned_site || '',
      status: editTarget.status || 'available',
      quantity: String(editTarget.quantity || 1),
      fuel_usage: String(editTarget.fuel_usage || 0),
      working_hours: String(editTarget.working_hours || 0),
      operator_name: editTarget.operator_name || '',
      condition: editTarget.condition || 'Good',
      maintenance_status: editTarget.maintenance_status || editTarget.status || 'active',
      notes: editTarget.notes || '',
    }
  }, [createType, editTarget])

  const openCreate = (type: ResourceType = activeTab === 'machinery' ? 'machinery' : 'manpower') => {
    setEditTarget(null)
    setCreateType(type)
    setDrawerOpen(true)
    if (type === 'machinery') setActiveTab('machinery')
    if (type === 'manpower') setActiveTab('manpower')
  }

  const submitResource = async (form: ResourceForm) => {
    setSaving(true)
    try {
      if (form.resource_type === 'manpower') {
        const payload = {
          name: form.name,
          role: form.role || form.category,
          skill_type: form.skill_type,
          contact: form.contact,
          daily_rate: form.daily_rate || null,
          assigned_site: form.assigned_site,
          shift: form.shift,
          status: form.status,
          availability: form.availability,
          notes: form.notes,
        }
        const res = editTarget?._type === 'manpower'
          ? await ergonApi.updateManpower(editTarget.id, payload)
          : await ergonApi.createManpower(payload)
        const saved = { ...extractOne(res.data), _type: 'manpower' as const }
        setManpower((prev) => editTarget?._type === 'manpower' ? prev.map((row) => row.id === saved.id ? saved : row) : [saved, ...prev])
        if (form.assigned_site) await ergonApi.createResourceAllocation({ resource_type: 'manpower', resource_id: saved.id, site_name: form.assigned_site, assigned_from: form.start_date, assigned_to: form.end_date || null, status: 'active', remarks: form.notes }).catch(() => null)
      } else {
        const payload = {
          name: form.name,
          type: form.category,
          registration_no: form.role,
          daily_rate: form.daily_rate || null,
          status: form.status,
          quantity: Number(form.quantity || 1),
          fuel_usage: form.fuel_usage || '0',
          working_hours: form.working_hours || '0',
          assigned_site: form.assigned_site,
          operator_name: form.operator_name,
          condition: form.condition,
          maintenance_status: form.maintenance_status,
          notes: form.notes,
        }
        const res = editTarget?._type === 'machinery'
          ? await ergonApi.updateMachinery(editTarget.id, payload)
          : await ergonApi.createMachinery(payload)
        const saved = { ...extractOne(res.data), _type: 'machinery' as const }
        setMachinery((prev) => editTarget?._type === 'machinery' ? prev.map((row) => row.id === saved.id ? saved : row) : [saved, ...prev])
        if (form.assigned_site) await ergonApi.createResourceAllocation({ resource_type: 'machinery', resource_id: saved.id, site_name: form.assigned_site, assigned_from: form.start_date, assigned_to: form.end_date || null, status: 'active', remarks: form.notes }).catch(() => null)
      }
      toast.success('Resource allocation saved')
      setDrawerOpen(false)
      setEditTarget(null)
      fetchAll()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || Object.values(error?.response?.data || {}).flat().join(', ') || 'Failed to save resource')
    } finally {
      setSaving(false)
    }
  }

  const exportReport = () => {
    const header = activeTab === 'machinery'
      ? ['Machine Name', 'Category', 'Quantity', 'Fuel Usage', 'Working Hours', 'Site Assigned', 'Operator', 'Condition', 'Maintenance Status']
      : ['Employee Name', 'Role', 'Skill Type', 'Contact', 'Daily Rate', 'Assigned Site', 'Status', 'Availability', 'Shift']
    const body = filteredRows.map((row) => row._type === 'machinery'
      ? [row.name, row.type, String(row.quantity || 1), String(row.fuel_usage || 0), String(row.working_hours || 0), site(row), row.operator_name || '', row.condition || '', row.maintenance_status || '']
      : [row.name, row.role, row.skill_type || '', row.contact || '', String(row.daily_rate || ''), site(row), row.status, row.availability || '', row.shift || ''])
    downloadCsv(`athens-${activeTab}-resources.csv`, [header, ...body])
  }

  const resetFilters = () => {
    setQuery('')
    setSiteFilter('all')
    setRoleFilter('all')
    setStatusFilter('all')
    setShiftFilter('all')
    setPage(1)
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'manpower', label: 'Manpower', icon: Users },
    { key: 'machinery', label: 'Machinery', icon: Truck },
    { key: 'allocation', label: 'Site Allocation', icon: MapPin },
    { key: 'utilization', label: 'Utilization Reports', icon: BarChart3 },
    { key: 'maintenance', label: 'Maintenance', icon: Wrench },
    { key: 'expenses', label: 'Expenses', icon: IndianRupee },
  ]

  return (
    <div className="space-y-6 p-6">
      <style>{`.athens-input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.athens-input:focus{box-shadow:0 0 0 2px hsl(var(--primary)/.35)}`}</style>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <HardHat className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Manpower & Machinery</h1>
          </div>
          <p className="text-sm text-muted-foreground">Resource allocation and utilization tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Allocate Resource</button>}
          {canManage && <button type="button" onClick={() => openCreate('manpower')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><MapPin className="h-4 w-4" /> Assign to Site</button>}
          <button type="button" onClick={exportReport} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><Download className="h-4 w-4" /> Export Report</button>
          <button type="button" onClick={() => setActiveTab('utilization')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><BarChart3 className="h-4 w-4" /> View Analytics</button>
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <KpiCard title="Total Manpower" value={manpower.length} helper="Employees and site workforce" trend={`${Math.max(manpower.length - available, 0)} deployed`} icon={Users} tone="bg-blue-50 text-blue-700" />
        <KpiCard title="Active Machinery" value={activeMachinery} helper="Equipment operational today" trend={`${machinery.filter((row) => row.maintenance_status === 'maintenance').length} in maintenance`} icon={Truck} tone="bg-violet-50 text-violet-700" />
        <KpiCard title="Assigned Resources" value={assigned} helper="Resources mapped to sites" trend={`${utilization}% utilization`} icon={CheckCircle} tone="bg-emerald-50 text-emerald-700" />
        <KpiCard title="Available Resources" value={available} helper="Ready for allocation" trend="Live availability" icon={Clock} tone="bg-sky-50 text-sky-700" />
        <KpiCard title="Monthly Cost" value={money(monthlyCost)} helper="Estimated 26 working days" trend={`${money(allRows.reduce((sum, row) => sum + rate(row), 0))}/day`} icon={IndianRupee} tone="bg-amber-50 text-amber-700" />
        <KpiCard title="Site Allocations" value={siteStats.length || allocations.length} helper="Active project/site boards" trend={`${allocations.length} allocation logs`} icon={MapPin} tone="bg-slate-50 text-slate-700" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setPage(1) }} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {(activeTab === 'manpower' || activeTab === 'machinery') && (
        <>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="athens-input pl-9" placeholder="Search by resource, site, role, operator" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select value={siteFilter} onChange={(event) => { setSiteFilter(event.target.value); setPage(1) }} className="athens-input min-w-[160px]">
                  <option value="all">All sites</option>
                  {SITES.map((item) => <option key={item}>{item}</option>)}
                  <option>Unassigned</option>
                </select>
              </div>
              <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }} className="athens-input min-w-[160px]">
                <option value="all">{activeTab === 'machinery' ? 'All machine types' : 'All roles'}</option>
                {(activeTab === 'machinery' ? MACHINE_TYPES : ROLES).map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="athens-input min-w-[150px]">
                <option value="all">All status</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="on leave">On Leave</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
                <option value="breakdown">Breakdown</option>
              </select>
              {activeTab === 'manpower' && (
                <select value={shiftFilter} onChange={(event) => { setShiftFilter(event.target.value); setPage(1) }} className="athens-input min-w-[140px]">
                  <option value="all">All shifts</option>
                  {SHIFTS.map((item) => <option key={item}>{item}</option>)}
                </select>
              )}
              <select value={`${sortKey}:${sortDir}`} onChange={(event) => { const [key, dir] = event.target.value.split(':'); setSortKey(key as SortKey); setSortDir(dir as 'asc' | 'desc') }} className="athens-input min-w-[150px]">
                <option value="name:asc">Name A-Z</option>
                <option value="site:asc">Site A-Z</option>
                <option value="status:asc">Status A-Z</option>
                <option value="rate:desc">Rate High-Low</option>
              </select>
              <button type="button" onClick={resetFilters} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">Clear</button>
            </div>
          </div>
          {loading ? (
            <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground">Loading resources...</div>
          ) : (
            <ResourceTable type={activeTab} rows={filteredRows} page={page} setPage={setPage} canManage={canManage} onEdit={(row) => { setEditTarget(row); setDrawerOpen(true) }} />
          )}
        </>
      )}

      {activeTab === 'allocation' && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          {(siteStats.length ? siteStats : SITES.slice(0, 3).map((name) => ({ name, manpower: 0, machinery: 0, cost: 0, fuel: 0, utilization: 0 }))).map((stat) => (
            <div key={stat.name} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{stat.name}</h3>
                  <p className="text-sm text-muted-foreground">Shift: General and Day</p>
                </div>
                <Badge status={stat.utilization > 75 ? 'assigned' : 'available'} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="Manpower" value={String(stat.manpower)} />
                <Info label="Machinery" value={String(stat.machinery)} />
                <Info label="Active Tasks" value={String(Math.max(stat.manpower + stat.machinery, 1) * 2)} />
                <Info label="Fuel Usage" value={`${stat.fuel.toFixed(1)} L`} />
                <Info label="Daily Expenses" value={money(stat.cost)} />
                <Info label="Utilization" value={`${stat.utilization}%`} />
              </div>
              <div className="mt-4">
                <MiniBar label="Site utilization" value={stat.utilization} max={100} helper={`${stat.utilization}%`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'utilization' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsCard title="Manpower utilization" icon={Users}>
            <MiniBar label="Assigned workforce" value={assigned} max={Math.max(allRows.length, 1)} helper={`${utilization}%`} />
            <MiniBar label="Available workforce" value={available} max={Math.max(allRows.length, 1)} helper={`${available} free`} />
            <MiniBar label="Site productivity" value={siteStats.reduce((sum, row) => sum + row.utilization, 0) / Math.max(siteStats.length, 1)} max={100} helper="weighted" />
          </AnalyticsCard>
          <AnalyticsCard title="Machine idle time and fuel" icon={Fuel}>
            <MiniBar label="Working hours" value={machinery.reduce((sum, row) => sum + Number(row.working_hours || 0), 0)} max={Math.max(machinery.length * 10, 1)} helper="today" />
            <MiniBar label="Fuel consumption" value={machinery.reduce((sum, row) => sum + Number(row.fuel_usage || 0), 0)} max={Math.max(machinery.length * 50, 1)} helper="litres" />
            <MiniBar label="Idle / maintenance" value={machinery.filter((row) => ['maintenance', 'breakdown'].includes(row.maintenance_status || '')).length} max={Math.max(machinery.length, 1)} helper="units" />
          </AnalyticsCard>
          <AnalyticsCard title="Monthly allocation cost" icon={IndianRupee}>
            {siteStats.map((stat) => <MiniBar key={stat.name} label={stat.name} value={stat.cost * 26} max={Math.max(monthlyCost, 1)} helper={money(stat.cost * 26)} />)}
            {siteStats.length === 0 && <MiniBar label="No allocation" value={0} max={1} helper={money(0)} />}
          </AnalyticsCard>
          <AnalyticsCard title="Resource heatmap" icon={Activity}>
            {SITES.slice(0, 6).map((name, index) => {
              const stat = siteStats.find((row) => row.name === name)
              return <MiniBar key={name} label={name} value={stat?.utilization || index * 8} max={100} helper={`${stat?.utilization || 0}%`} />
            })}
          </AnalyticsCard>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          {machinery.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{row.name}</h3>
                  <p className="text-sm text-muted-foreground">{row.type} - {site(row)}</p>
                </div>
                <Badge status={row.maintenance_status || row.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Info label="Condition" value={row.condition || 'Good'} />
                <Info label="Working Hours" value={`${Number(row.working_hours || 0)} h`} />
                <Info label="Fuel Usage" value={`${Number(row.fuel_usage || 0)} L`} />
                <Info label="Operator" value={row.operator_name || '-'} />
              </div>
            </div>
          ))}
          {machinery.length === 0 && <EmptyState />}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <AnalyticsCard title="Daily resource expenses" icon={IndianRupee}>
            <Info label="Manpower Cost / Day" value={money(manpower.reduce((sum, row) => sum + rate(row), 0))} />
            <Info label="Machinery Cost / Day" value={money(machinery.reduce((sum, row) => sum + rate(row), 0))} />
            <Info label="Fuel Estimate / Day" value={money(machinery.reduce((sum, row) => sum + Number(row.fuel_usage || 0) * 95, 0))} />
          </AnalyticsCard>
          <AnalyticsCard title="Payroll integration" icon={Briefcase}>
            <Info label="Attendance Sync" value="Ready" />
            <Info label="Wage Basis" value="Daily Rate" />
            <Info label="Shift Allowance" value="Tracked" />
          </AnalyticsCard>
          <AnalyticsCard title="Project cost capture" icon={ShieldCheck}>
            <Info label="Task Linkage" value="Site allocation" />
            <Info label="Daily Reports" value="Resource logs" />
            <Info label="Expense Module" value="Fuel and site costs" />
          </AnalyticsCard>
        </div>
      )}

      <ResourceDrawer open={drawerOpen} initial={formInitial} saving={saving} onClose={() => { setDrawerOpen(false); setEditTarget(null) }} onSubmit={submitResource} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  )
}

function AnalyticsCard({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
