import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  IndianRupee,
  Paperclip,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Upload,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../../services/ergonApi'
import { useAuthStore } from '../../../store/authStore'

type RecordType = 'advance' | 'expense'
type ViewMode = 'overview' | 'expenses' | 'advances' | 'create-expense' | 'create-advance' | 'detail'
type SortKey = 'employee' | 'category' | 'amount' | 'date' | 'status'

interface ApprovalLog {
  id: number
  action: string
  comments: string
  performed_by_name?: string
  created_at: string
}

interface AdvanceRecord {
  id: number
  employee_name: string
  project_name?: string
  advance_type?: string
  amount: string
  approved_amount?: string | null
  purpose: string
  reason?: string
  status: string
  requested_date: string
  approved_date: string | null
  repayment_date?: string | null
  salary_recovery?: boolean
  approved_by_name: string | null
  rejection_reason: string
  supporting_document?: string | null
  attachment?: string | null
  notes?: string
  approval_logs?: ApprovalLog[]
  created_at?: string
  _type: 'advance'
}

interface ExpenseRecord {
  id: number
  employee_name: string
  project_name?: string
  category: string
  work_category?: string
  amount: string
  description: string
  expense_date: string
  status: string
  approval_status?: string
  reimbursement_status?: string
  approved_by_name: string | null
  rejection_reason: string
  receipt?: string | null
  payment_method?: string
  vendor_name?: string
  bill_number?: string
  gst_amount?: string
  gst_included?: boolean
  approval_logs?: ApprovalLog[]
  created_at?: string
  _type: 'expense'
}

type FinanceRecord = AdvanceRecord | ExpenseRecord

interface ExpenseDraft {
  category: string
  work_category: string
  project: string
  amount: string
  expense_date: string
  description: string
  payment_method: string
  gst_included: boolean
  bill_number: string
  vendor_name: string
  file: File | null
}

interface AdvanceDraft {
  advance_type: string
  project: string
  amount: string
  reason: string
  repayment_date: string
  notes: string
  salary_recovery: boolean
  file: File | null
}

const EXPENSE_CATEGORIES = ['Travel', 'Food', 'Fuel', 'Accommodation', 'Medical', 'Client Meeting', 'Equipment', 'Office Expense', 'Internet', 'Training', 'Miscellaneous']
const ADVANCE_TYPES = ['Salary Advance', 'Travel Advance', 'Project Advance', 'Emergency Advance', 'Medical Advance', 'Vendor Advance', 'Cash Advance']
const WORK_CATEGORIES = ['Project Work', 'Client Visit', 'Site Operations', 'Administration', 'Training', 'Business Development', 'Other']
const PAYMENT_METHODS = ['Employee Paid', 'Company Card', 'Cash', 'UPI', 'Bank Transfer', 'Vendor Direct']
const PAGE_SIZE = 8

const emptyExpenseDraft: ExpenseDraft = {
  category: 'Travel',
  work_category: 'Project Work',
  project: '',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  payment_method: 'Employee Paid',
  gst_included: false,
  bill_number: '',
  vendor_name: '',
  file: null,
}

const emptyAdvanceDraft: AdvanceDraft = {
  advance_type: 'Project Advance',
  project: '',
  amount: '',
  reason: '',
  repayment_date: '',
  notes: '',
  salary_recovery: false,
  file: null,
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

function amountValue(row: FinanceRecord) {
  return Number(row.amount || 0)
}

function approvedAmount(row: FinanceRecord) {
  if (row._type === 'advance') return Number(row.approved_amount || row.amount || 0)
  return amountValue(row)
}

function titleOf(row: FinanceRecord) {
  return row._type === 'advance' ? (row.reason || row.purpose) : row.description
}

function dateOf(row: FinanceRecord) {
  return row._type === 'advance' ? row.requested_date : row.expense_date
}

function fileOf(row: FinanceRecord) {
  return row._type === 'advance' ? (row.attachment || row.supporting_document) : row.receipt
}

function projectOf(row: FinanceRecord) {
  return row.project_name || 'General'
}

function statusOf(row: FinanceRecord) {
  if (row._type === 'expense' && row.reimbursement_status === 'reimbursed') return 'reimbursed'
  if (row._type === 'expense' && row.reimbursement_status === 'partial_reimbursed') return 'partial_reimbursed'
  return row.status || 'submitted'
}

function labelStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function statusClasses(status: string) {
  if (['approved', 'paid', 'reimbursed'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (['submitted', 'under_review', 'pending'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (['rejected'].includes(status)) return 'bg-rose-50 text-rose-700 border-rose-200'
  if (['partial_reimbursed', 'partial_paid'].includes(status)) return 'bg-sky-50 text-sky-700 border-sky-200'
  if (['draft'].includes(status)) return 'bg-slate-50 text-slate-700 border-slate-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

function canApproveRecord(user: any) {
  if (!user) return false
  return (
    user.user_type === 'superadmin' ||
    user.user_type === 'masteradmin' ||
    user.admin_type === 'client' ||
    user.admin_type === 'epc' ||
    user.admin_type === 'contractor' ||
    user.role_type === 'admin'
  )
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

function StatCard({ title, value, status, caption, icon: Icon, tone }: {
  title: string
  value: string | number
  status: string
  caption: string
  icon: any
  tone: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
          <span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClasses(status)}`}>{labelStatus(status)}</span>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function MiniBarChart({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[96px_1fr_88px] items-center gap-3 text-xs">
            <span className="truncate text-muted-foreground">{row.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((row.value / max) * 100, row.value ? 8 : 0)}%` }} />
            </div>
            <span className="text-right font-medium text-foreground">{money(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RequestModal({ type, open, onClose, onCreated }: {
  type: RecordType
  open: boolean
  onClose: () => void
  onCreated: (row: FinanceRecord) => void
}) {
  const [expense, setExpense] = useState<ExpenseDraft>(emptyExpenseDraft)
  const [advance, setAdvance] = useState<AdvanceDraft>(emptyAdvanceDraft)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const storageKey = type === 'expense' ? 'athens-expense-draft' : 'athens-advance-draft'

  useEffect(() => {
    if (!open) return
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (type === 'expense') setExpense((prev) => ({ ...prev, ...parsed, file: null }))
      else setAdvance((prev) => ({ ...prev, ...parsed, file: null }))
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [open, storageKey, type])

  useEffect(() => {
    if (!open) return
    const draft = type === 'expense' ? expense : advance
    const { file, ...serializable } = draft
    localStorage.setItem(storageKey, JSON.stringify(serializable))
  }, [advance, expense, open, storageKey, type])

  useEffect(() => {
    const file = type === 'expense' ? expense.file : advance.file
    if (!file) {
      setPreviewUrl('')
      return
    }
    if (!file.type.startsWith('image/')) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [advance.file, expense.file, type])

  if (!open) return null

  const setFile = (file?: File | null) => {
    if (!file) return
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Upload an image or PDF file')
      return
    }
    if (type === 'expense') setExpense((prev) => ({ ...prev, file }))
    else setAdvance((prev) => ({ ...prev, file }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const amount = Number(type === 'expense' ? expense.amount : advance.amount)
    const description = type === 'expense' ? expense.description : advance.reason
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!description.trim()) {
      toast.error(type === 'expense' ? 'Description is required' : 'Reason is required')
      return
    }

    setSaving(true)
    try {
      let response
      if (type === 'expense') {
        const payload = new FormData()
        payload.append('category', expense.category)
        payload.append('work_category', expense.work_category)
        payload.append('amount', expense.amount)
        payload.append('expense_date', expense.expense_date)
        payload.append('description', expense.description)
        payload.append('payment_method', expense.payment_method)
        payload.append('gst_included', String(expense.gst_included))
        payload.append('bill_number', expense.bill_number)
        payload.append('vendor_name', expense.vendor_name)
        payload.append('status', 'submitted')
        payload.append('approval_status', 'submitted')
        payload.append('reimbursement_status', 'pending')
        if (expense.file) payload.append('receipt', expense.file)
        response = await ergonApi.createExpense(payload)
      } else {
        const payload = new FormData()
        payload.append('advance_type', advance.advance_type)
        payload.append('amount', advance.amount)
        payload.append('purpose', advance.reason)
        payload.append('reason', advance.reason)
        payload.append('repayment_date', advance.repayment_date)
        payload.append('notes', advance.notes)
        payload.append('salary_recovery', String(advance.salary_recovery))
        payload.append('status', 'submitted')
        if (advance.file) {
          payload.append('attachment', advance.file)
          payload.append('supporting_document', advance.file)
        }
        response = await ergonApi.createAdvance(payload)
      }
      const created = { ...extractOne(response.data), _type: type } as FinanceRecord
      localStorage.removeItem(storageKey)
      toast.success(type === 'expense' ? 'Expense submitted' : 'Advance request submitted')
      onCreated(created)
      onClose()
    } catch (error: any) {
      const data = error?.response?.data
      toast.error(data?.detail || Object.values(data || {}).flat().join(', ') || 'Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  const title = type === 'expense' ? 'Submit Expense' : 'Request Advance'
  const file = type === 'expense' ? expense.file : advance.file

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">Drafts auto-save locally until submitted.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {type === 'expense' ? (
              <>
                <Field label="Category">
                  <select value={expense.category} onChange={(event) => setExpense((prev) => ({ ...prev, category: event.target.value }))} className="athens-input">
                    {EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Work Category">
                  <select value={expense.work_category} onChange={(event) => setExpense((prev) => ({ ...prev, work_category: event.target.value }))} className="athens-input">
                    {WORK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Project">
                  <input value={expense.project} onChange={(event) => setExpense((prev) => ({ ...prev, project: event.target.value }))} className="athens-input" placeholder="Project or cost center" />
                </Field>
                <Field label="Amount">
                  <input type="number" min="1" step="0.01" value={expense.amount} onChange={(event) => setExpense((prev) => ({ ...prev, amount: event.target.value }))} className="athens-input" placeholder="0.00" />
                </Field>
                <Field label="Expense Date">
                  <input type="date" value={expense.expense_date} onChange={(event) => setExpense((prev) => ({ ...prev, expense_date: event.target.value }))} className="athens-input" />
                </Field>
                <Field label="Payment Method">
                  <select value={expense.payment_method} onChange={(event) => setExpense((prev) => ({ ...prev, payment_method: event.target.value }))} className="athens-input">
                    {PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Bill Number">
                  <input value={expense.bill_number} onChange={(event) => setExpense((prev) => ({ ...prev, bill_number: event.target.value }))} className="athens-input" placeholder="Invoice or receipt number" />
                </Field>
                <Field label="Vendor Name">
                  <input value={expense.vendor_name} onChange={(event) => setExpense((prev) => ({ ...prev, vendor_name: event.target.value }))} className="athens-input" placeholder="Vendor or merchant" />
                </Field>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input type="checkbox" checked={expense.gst_included} onChange={(event) => setExpense((prev) => ({ ...prev, gst_included: event.target.checked }))} />
                  GST Included
                </label>
                <Field label="Description" className="md:col-span-2">
                  <textarea rows={3} value={expense.description} onChange={(event) => setExpense((prev) => ({ ...prev, description: event.target.value }))} className="athens-input" placeholder="Describe the business expense" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Advance Type">
                  <select value={advance.advance_type} onChange={(event) => setAdvance((prev) => ({ ...prev, advance_type: event.target.value }))} className="athens-input">
                    {ADVANCE_TYPES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Project">
                  <input value={advance.project} onChange={(event) => setAdvance((prev) => ({ ...prev, project: event.target.value }))} className="athens-input" placeholder="Project or cost center" />
                </Field>
                <Field label="Amount">
                  <input type="number" min="1" step="0.01" value={advance.amount} onChange={(event) => setAdvance((prev) => ({ ...prev, amount: event.target.value }))} className="athens-input" placeholder="0.00" />
                </Field>
                <Field label="Expected Repayment Date">
                  <input type="date" value={advance.repayment_date} onChange={(event) => setAdvance((prev) => ({ ...prev, repayment_date: event.target.value }))} className="athens-input" />
                </Field>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input type="checkbox" checked={advance.salary_recovery} onChange={(event) => setAdvance((prev) => ({ ...prev, salary_recovery: event.target.checked }))} />
                  Salary Recovery Option
                </label>
                <Field label="Reason" className="md:col-span-2">
                  <textarea rows={3} value={advance.reason} onChange={(event) => setAdvance((prev) => ({ ...prev, reason: event.target.value }))} className="athens-input" placeholder="Why is the advance required?" />
                </Field>
                <Field label="Notes" className="md:col-span-2">
                  <textarea rows={2} value={advance.notes} onChange={(event) => setAdvance((prev) => ({ ...prev, notes: event.target.value }))} className="athens-input" placeholder="Settlement, recovery, or finance notes" />
                </Field>
              </>
            )}

            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); setFile(event.dataTransfer.files?.[0]) }}
              className={`md:col-span-2 rounded-lg border border-dashed p-4 ${dragging ? 'border-primary bg-accent' : 'border-border bg-background'}`}
            >
              <input id={`finance-file-${type}`} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => setFile(event.target.files?.[0])} />
              <label htmlFor={`finance-file-${type}`} className="flex cursor-pointer flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <Upload className="h-5 w-5" />
                <span>{file ? file.name : type === 'expense' ? 'Drag receipt here or upload image/PDF' : 'Drag attachment here or upload image/PDF'}</span>
              </label>
              {previewUrl && <img src={previewUrl} alt="Receipt preview" className="mx-auto mt-3 max-h-36 rounded border border-border object-contain" />}
              {file && !previewUrl && <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-2 rounded border border-border bg-card p-3 text-sm text-muted-foreground"><Paperclip className="h-4 w-4" /> {file.name}</div>}
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card p-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saving ? 'Submitting...' : title}
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

function RejectModal({ row, loading, onClose, onConfirm }: {
  row: FinanceRecord | null
  loading: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  useEffect(() => setReason(''), [row?.id, row?._type])
  if (!row) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Reject request</h2>
            <p className="text-xs text-muted-foreground">{titleOf(row)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-4">
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="athens-input" placeholder="Document rejection comments for audit history" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">Cancel</button>
            <button type="button" disabled={!reason.trim() || loading} onClick={() => onConfirm(reason)} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
              {loading ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FinanceTable({ rows, type, sortKey, sortDir, setSort, page, setPage, onApprove, onReject, onReimburse, onPayAdvance, onEscalate, busyId }: {
  rows: FinanceRecord[]
  type: RecordType
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  setSort: (key: SortKey) => void
  page: number
  setPage: (page: number) => void
  onApprove: (row: FinanceRecord) => void
  onReject: (row: FinanceRecord) => void
  onReimburse: (row: FinanceRecord) => void
  onPayAdvance: (row: FinanceRecord) => void
  onEscalate: (row: FinanceRecord) => void
  busyId: string | null
}) {
  const currentUser = useAuthStore((state) => state.user)
  const canApprove = canApproveRecord(currentUser)
  const sorted = useMemo(() => {
    const next = [...rows]
    next.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1
      const getValue = (row: FinanceRecord) => {
        if (sortKey === 'employee') return row.employee_name || ''
        if (sortKey === 'category') return row._type === 'expense' ? row.category : row.advance_type || ''
        if (sortKey === 'amount') return amountValue(row)
        if (sortKey === 'date') return dateOf(row) || ''
        return statusOf(row)
      }
      return getValue(a) > getValue(b) ? direction : -direction
    })
    return next
  }, [rows, sortDir, sortKey])
  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1)
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, setPage, totalPages])

  const headers = type === 'expense'
    ? [
        ['employee', 'Employee / Owner'],
        ['category', 'Category'],
        ['project', 'Project'],
        ['description', 'Description'],
        ['amount', 'Amount'],
        ['date', 'Expense Date'],
        ['status', 'Status'],
        ['reimbursement', 'Reimbursement Status'],
        ['approved', 'Approved By'],
      ]
    : [
        ['employee', 'Employee'],
        ['category', 'Advance Type'],
        ['amount', 'Amount'],
        ['reason', 'Reason'],
        ['approved_amount', 'Approved Amount'],
        ['status', 'Status'],
        ['date', 'Requested Date'],
        ['repayment', 'Expected Repayment'],
      ]

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-border bg-accent/50 text-xs uppercase text-muted-foreground">
              <tr>
                {headers.map(([key, label]) => (
                  <th key={key} className="px-4 py-3">
                    {['employee', 'category', 'amount', 'date', 'status'].includes(key) ? (
                      <button type="button" onClick={() => setSort(key as SortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {label}{sortKey === key && <span>{sortDir === 'asc' ? '^' : 'v'}</span>}
                      </button>
                    ) : label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((row) => {
                const busy = busyId === `${row._type}-${row.id}`
                return (
                  <tr key={`${row._type}-${row.id}`} className="hover:bg-accent/30">
                    {type === 'expense' ? (
                      <>
                        <td className="px-4 py-3 font-medium text-foreground">{row.employee_name || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{(row as ExpenseRecord).category}</td>
                        <td className="px-4 py-3 text-muted-foreground">{projectOf(row)}</td>
                        <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">{titleOf(row)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{money(amountValue(row))}</td>
                        <td className="px-4 py-3 text-muted-foreground">{dateOf(row)}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-3"><StatusBadge status={(row as ExpenseRecord).reimbursement_status || 'pending'} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{row.approved_by_name || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-foreground">{row.employee_name || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{(row as AdvanceRecord).advance_type || 'Project Advance'}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{money(amountValue(row))}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground">{titleOf(row)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{money(approvedAmount(row))}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{dateOf(row)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{(row as AdvanceRecord).repayment_date || '-'}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <RowActions row={row} busy={busy} canApprove={canApprove} onApprove={onApprove} onReject={onReject} onReimburse={onReimburse} onPayAdvance={onPayAdvance} onEscalate={onEscalate} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 && <EmptyState />}
      </div>

      <div className="grid gap-3 lg:hidden">
        {pageRows.map((row) => {
          const busy = busyId === `${row._type}-${row.id}`
          return (
            <div key={`${row._type}-${row.id}`} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{row.employee_name || 'Unassigned'}</p>
                  <p className="text-sm text-muted-foreground">{row._type === 'expense' ? (row as ExpenseRecord).category : (row as AdvanceRecord).advance_type}</p>
                </div>
                <p className="font-semibold text-foreground">{money(amountValue(row))}</p>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{titleOf(row)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={statusOf(row)} />
                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{dateOf(row)}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <RowActions row={row} busy={busy} canApprove={canApprove} onApprove={onApprove} onReject={onReject} onReimburse={onReimburse} onPayAdvance={onPayAdvance} onEscalate={onEscalate} />
              </div>
            </div>
          )
        })}
        {pageRows.length === 0 && <EmptyState />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        <span>Showing {pageRows.length} of {sorted.length} records</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border border-border p-2 hover:bg-accent disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded border border-border p-2 hover:bg-accent disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  )
}

function RowActions({ row, busy, canApprove, onApprove, onReject, onReimburse, onPayAdvance, onEscalate }: {
  row: FinanceRecord
  busy: boolean
  canApprove: boolean
  onApprove: (row: FinanceRecord) => void
  onReject: (row: FinanceRecord) => void
  onReimburse: (row: FinanceRecord) => void
  onPayAdvance: (row: FinanceRecord) => void
  onEscalate: (row: FinanceRecord) => void
}) {
  return (
    <div className="flex justify-end gap-1.5">
      <Link to={`/app/finance/${row._type === 'expense' ? 'expenses' : 'advances'}/${row.id}`} className="rounded border border-border p-2 text-muted-foreground hover:bg-accent" title="View"><Eye className="h-4 w-4" /></Link>
      {fileOf(row) && <a href={fileOf(row) || '#'} target="_blank" rel="noreferrer" className="rounded border border-border p-2 text-muted-foreground hover:bg-accent" title="Document"><Paperclip className="h-4 w-4" /></a>}
      {canApprove && ['pending', 'submitted', 'under_review'].includes(row.status) && (
        <>
          <button type="button" disabled={busy} onClick={() => onApprove(row)} className="rounded bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50" title="Approve"><CheckCircle className="h-4 w-4" /></button>
          <button type="button" disabled={busy} onClick={() => onReject(row)} className="rounded bg-rose-600 p-2 text-white hover:bg-rose-700 disabled:opacity-50" title="Reject"><XCircle className="h-4 w-4" /></button>
        </>
      )}
      {canApprove && row._type === 'expense' && row.status === 'approved' && <button type="button" disabled={busy} onClick={() => onReimburse(row)} className="rounded bg-sky-600 p-2 text-white hover:bg-sky-700 disabled:opacity-50" title="Reimburse"><FileCheck className="h-4 w-4" /></button>}
      {canApprove && row._type === 'advance' && row.status === 'approved' && <button type="button" disabled={busy} onClick={() => onPayAdvance(row)} className="rounded bg-sky-600 p-2 text-white hover:bg-sky-700 disabled:opacity-50" title="Pay advance"><IndianRupee className="h-4 w-4" /></button>}
      {canApprove && <button type="button" disabled={busy} onClick={() => onEscalate(row)} className="rounded border border-border p-2 text-muted-foreground hover:bg-accent" title="Escalate"><Bell className="h-4 w-4" /></button>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${statusClasses(status)}`}>{labelStatus(status)}</span>
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card py-12 text-muted-foreground">
      <FileText className="h-8 w-8 opacity-50" />
      <p className="text-sm">No records match the current filters.</p>
    </div>
  )
}

function DetailView({ rows, onApprove, onReject, onReimburse, onPayAdvance, onEscalate, busyId }: {
  rows: FinanceRecord[]
  onApprove: (row: FinanceRecord) => void
  onReject: (row: FinanceRecord) => void
  onReimburse: (row: FinanceRecord) => void
  onPayAdvance: (row: FinanceRecord) => void
  onEscalate: (row: FinanceRecord) => void
  busyId: string | null
}) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const canApprove = canApproveRecord(currentUser)
  const type: RecordType = location.pathname.includes('/advances/') ? 'advance' : 'expense'
  const row = rows.find((item) => item._type === type && String(item.id) === String(id))

  if (!row) return <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">Request not found or still loading.</div>

  const logs = row.approval_logs || []
  const workflow = row._type === 'expense'
    ? ['Employee', 'Reporting Manager', 'Finance Team', 'Admin Approval', 'Payment/Reimbursement']
    : ['Employee', 'Reporting Manager', 'Finance Team', 'Admin Approval', 'Payment']

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{titleOf(row)}</h1>
            <p className="text-sm text-muted-foreground">Request #{row.id} - {row.employee_name}</p>
          </div>
        </div>
        <StatusBadge status={statusOf(row)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-4">
              <Info label="Amount" value={money(amountValue(row))} />
              <Info label="Project" value={projectOf(row)} />
              <Info label="Date" value={dateOf(row)} />
              <Info label="Approved By" value={row.approved_by_name || '-'} />
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs uppercase text-muted-foreground">Business justification</p>
              <p className="mt-2 text-sm leading-6 text-foreground">{titleOf(row)}</p>
            </div>
            {row.rejection_reason && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{row.rejection_reason}</div>}
            <div className="mt-5 flex flex-wrap gap-2">
              {fileOf(row) && <a href={fileOf(row) || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><Download className="h-4 w-4" /> Document</a>}
              <RowActions row={row} busy={busyId === `${row._type}-${row.id}`} canApprove={canApprove} onApprove={onApprove} onReject={onReject} onReimburse={onReimburse} onPayAdvance={onPayAdvance} onEscalate={onEscalate} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Approval history</h2>
            <div className="space-y-3">
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">No approval history yet.</p> : logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={log.action} />
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{log.comments || 'No comments'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">By {log.performed_by_name || 'System'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-foreground">Approval workflow</h2>
          <div className="space-y-4">
            {workflow.map((step, index) => {
              const done = index === 0 || (index === 1 && row.status !== 'submitted') || (index >= 2 && ['approved', 'paid', 'reimbursed', 'partial_reimbursed'].includes(statusOf(row))) || (index === 4 && ['paid', 'reimbursed'].includes(statusOf(row)))
              return (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full border text-center text-sm leading-8 ${done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-background text-muted-foreground'}`}>{index + 1}</div>
                    {index < workflow.length - 1 && <div className="h-8 w-px bg-border" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step}</p>
                    <p className="text-xs text-muted-foreground">{done ? 'Completed or active' : 'Pending'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export default function AdvanceExpenseModule({ mode = 'overview' }: { mode?: ViewMode }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<FinanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<FinanceRecord | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [modalType, setModalType] = useState<RecordType | null>(mode === 'create-expense' ? 'expense' : mode === 'create-advance' ? 'advance' : null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [advancesResponse, expensesResponse] = await Promise.all([ergonApi.getAdvances(), ergonApi.getExpenses()])
      const advances = extractList(advancesResponse.data).map((item) => ({ ...item, _type: 'advance' as const }))
      const expenses = extractList(expensesResponse.data).map((item) => ({ ...item, _type: 'expense' as const }))
      setRows([...advances, ...expenses].sort((a, b) => String(b.created_at || b.id).localeCompare(String(a.created_at || a.id))))
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load finance records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (mode === 'create-expense') setModalType('expense')
    if (mode === 'create-advance') setModalType('advance')
  }, [mode])

  const currentType: RecordType = mode === 'advances' || mode === 'create-advance' ? 'advance' : 'expense'
  const typedRows = rows.filter((row) => row._type === currentType)
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return typedRows.filter((row) => {
      const text = [
        titleOf(row),
        row.employee_name,
        row._type === 'expense' ? (row as ExpenseRecord).category : (row as AdvanceRecord).advance_type,
        projectOf(row),
        row.status,
      ].join(' ').toLowerCase()
      return (!q || text.includes(q)) && (status === 'all' || statusOf(row) === status || row.status === status)
    })
  }, [query, status, typedRows])

  const expenseRows = rows.filter((row) => row._type === 'expense') as ExpenseRecord[]
  const advanceRows = rows.filter((row) => row._type === 'advance') as AdvanceRecord[]
  const expenseMetrics = {
    total: expenseRows.reduce((sum, row) => sum + amountValue(row), 0),
    pending: expenseRows.filter((row) => ['pending', 'submitted', 'under_review'].includes(row.status)).reduce((sum, row) => sum + amountValue(row), 0),
    approvedUnpaid: expenseRows.filter((row) => row.status === 'approved' && row.reimbursement_status !== 'reimbursed').reduce((sum, row) => sum + amountValue(row), 0),
    reimbursed: expenseRows.filter((row) => statusOf(row) === 'reimbursed').reduce((sum, row) => sum + amountValue(row), 0),
    rejected: expenseRows.filter((row) => row.status === 'rejected').length,
  }
  const advanceMetrics = {
    total: advanceRows.reduce((sum, row) => sum + amountValue(row), 0),
    pending: advanceRows.filter((row) => ['pending', 'submitted', 'under_review'].includes(row.status)).reduce((sum, row) => sum + amountValue(row), 0),
    approvedUnpaid: advanceRows.filter((row) => row.status === 'approved').reduce((sum, row) => sum + approvedAmount(row), 0),
    paid: advanceRows.filter((row) => row.status === 'paid').reduce((sum, row) => sum + approvedAmount(row), 0),
    rejected: advanceRows.filter((row) => row.status === 'rejected').length,
    recovery: advanceRows.filter((row) => row.salary_recovery && row.status !== 'paid').reduce((sum, row) => sum + approvedAmount(row), 0),
  }

  const monthRows = useMemo(() => {
    const source = currentType === 'expense' ? expenseRows : advanceRows
    const byMonth = new Map<string, number>()
    source.forEach((row) => {
      const date = dateOf(row) || ''
      const key = date.slice(0, 7) || 'No date'
      byMonth.set(key, (byMonth.get(key) || 0) + amountValue(row))
    })
    return Array.from(byMonth.entries()).slice(-6).map(([label, value]) => ({ label, value }))
  }, [advanceRows, currentType, expenseRows])

  const categoryRows = useMemo(() => {
    const source = currentType === 'expense' ? expenseRows : advanceRows
    const grouped = new Map<string, number>()
    source.forEach((row) => {
      const key = row._type === 'expense' ? row.category : row.advance_type || 'Advance'
      grouped.set(key, (grouped.get(key) || 0) + amountValue(row))
    })
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }))
  }, [advanceRows, currentType, expenseRows])

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((prev) => prev === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const patchRow = (row: FinanceRecord, next: any) => setRows((prev) => prev.map((item) => item.id === row.id && item._type === row._type ? { ...item, ...next, _type: row._type } : item))

  const approve = async (row: FinanceRecord) => {
    setBusyId(`${row._type}-${row.id}`)
    try {
      const response = row._type === 'advance' ? await ergonApi.approveAdvance(row.id) : await ergonApi.approveExpense(row.id)
      patchRow(row, extractOne(response.data))
      toast.success('Approval completed')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Approval failed')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (reason: string) => {
    if (!rejectTarget) return
    setRejecting(true)
    try {
      const response = rejectTarget._type === 'advance' ? await ergonApi.rejectAdvance(rejectTarget.id, reason) : await ergonApi.rejectExpense(rejectTarget.id, reason)
      patchRow(rejectTarget, extractOne(response.data))
      toast.success('Request rejected')
      setRejectTarget(null)
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Rejection failed')
    } finally {
      setRejecting(false)
    }
  }

  const reimburse = async (row: FinanceRecord) => {
    if (row._type !== 'expense') return
    setBusyId(`${row._type}-${row.id}`)
    try {
      const response = await ergonApi.reimburseExpense(row.id, { comments: 'Reimbursement processed from finance dashboard.' })
      patchRow(row, extractOne(response.data))
      toast.success('Reimbursement processed')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unable to process reimbursement')
    } finally {
      setBusyId(null)
    }
  }

  const payAdvance = async (row: FinanceRecord) => {
    if (row._type !== 'advance') return
    setBusyId(`${row._type}-${row.id}`)
    try {
      const response = await ergonApi.payAdvance(row.id, { comments: 'Advance payment processed from finance dashboard.' })
      patchRow(row, extractOne(response.data))
      toast.success('Advance marked paid')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Unable to process advance payment')
    } finally {
      setBusyId(null)
    }
  }

  const escalate = async (row: FinanceRecord) => {
    setBusyId(`${row._type}-${row.id}`)
    try {
      const response = row._type === 'advance'
        ? await ergonApi.escalateAdvance(row.id, 'Escalated from finance dashboard.')
        : await ergonApi.escalateExpense(row.id, 'Escalated from finance dashboard.')
      patchRow(row, extractOne(response.data))
      toast.success('Escalation notification queued')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Escalation failed')
    } finally {
      setBusyId(null)
    }
  }

  const exportRows = () => {
    const header = currentType === 'expense'
      ? ['Employee', 'Category', 'Project', 'Description', 'Amount', 'Expense Date', 'Status', 'Reimbursement Status', 'Approved By']
      : ['Employee', 'Advance Type', 'Amount', 'Reason', 'Approved Amount', 'Status', 'Requested Date', 'Expected Repayment']
    const body = filteredRows.map((row) => currentType === 'expense'
      ? [row.employee_name, (row as ExpenseRecord).category, projectOf(row), titleOf(row), row.amount, dateOf(row), row.status, (row as ExpenseRecord).reimbursement_status || 'pending', row.approved_by_name || '']
      : [row.employee_name, (row as AdvanceRecord).advance_type || '', row.amount, titleOf(row), String(approvedAmount(row)), row.status, dateOf(row), (row as AdvanceRecord).repayment_date || ''])
    downloadCsv(`athens-${currentType}s.csv`, [header, ...body])
  }

  const closeModal = () => {
    setModalType(null)
    if (mode === 'create-expense') navigate('/app/finance/expenses')
    if (mode === 'create-advance') navigate('/app/finance/advances')
  }

  if (mode === 'detail') {
    return (
      <div className="space-y-5 p-6">
        <DetailView rows={rows} onApprove={approve} onReject={setRejectTarget} onReimburse={reimburse} onPayAdvance={payAdvance} onEscalate={escalate} busyId={busyId} />
        <RejectModal row={rejectTarget} loading={rejecting} onClose={() => setRejectTarget(null)} onConfirm={reject} />
      </div>
    )
  }

  const metrics = currentType === 'expense' ? expenseMetrics : advanceMetrics

  return (
    <div className="space-y-5 p-6">
      <style>{`.athens-input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.athens-input:focus{box-shadow:0 0 0 2px hsl(var(--primary)/.35)}`}</style>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/app/ergon" className="hover:text-foreground">ERGON</Link>
            <ChevronRight className="h-4 w-4" />
            <span>{currentType === 'expense' ? 'Expense Management' : 'Advance Management'}</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{currentType === 'expense' ? 'Expense Management Dashboard' : 'Advance Requests Dashboard'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentType === 'expense' ? 'Track employee expenses, approvals, reimbursements, and audit history.' : 'Manage advance requests, approvals, payments, recovery, and settlement history.'}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/finance/advances" className={`inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent ${currentType === 'advance' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Banknote className="h-4 w-4" /> Advances</Link>
          <Link to="/app/finance/expenses" className={`inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent ${currentType === 'expense' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Receipt className="h-4 w-4" /> Expenses</Link>
          <button type="button" onClick={() => setModalType(currentType)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {currentType === 'expense' ? 'Submit Expense' : 'Request Advance'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        {currentType === 'expense' ? (
          <>
            <StatCard title="Total Expenses Submitted" value={money(expenseMetrics.total)} status="submitted" caption="All employee claims" icon={Receipt} tone="bg-violet-50 text-violet-700" />
            <StatCard title="Pending Review Amount" value={money(expenseMetrics.pending)} status="under_review" caption="Awaiting manager or finance review" icon={Clock} tone="bg-amber-50 text-amber-700" />
            <StatCard title="Approved - Yet to Reimburse" value={money(expenseMetrics.approvedUnpaid)} status="approved" caption="Approved claims pending payout" icon={FileCheck} tone="bg-blue-50 text-blue-700" />
            <StatCard title="Total Reimbursed" value={money(expenseMetrics.reimbursed)} status="reimbursed" caption="Completed employee reimbursements" icon={IndianRupee} tone="bg-emerald-50 text-emerald-700" />
            <StatCard title="Rejected Claims" value={expenseMetrics.rejected} status="rejected" caption="Claims returned with comments" icon={XCircle} tone="bg-rose-50 text-rose-700" />
            <StatCard title="Monthly Expense Trend" value={money(monthRows.reduce((sum, row) => sum + row.value, 0))} status="submitted" caption="Current visible trend total" icon={BarChart3} tone="bg-sky-50 text-sky-700" />
          </>
        ) : (
          <>
            <StatCard title="Total Advances Requested" value={money(advanceMetrics.total)} status="submitted" caption="All advance demand" icon={Wallet} tone="bg-sky-50 text-sky-700" />
            <StatCard title="Pending Approval Amount" value={money(advanceMetrics.pending)} status="under_review" caption="Awaiting manager or admin approval" icon={Clock} tone="bg-amber-50 text-amber-700" />
            <StatCard title="Approved - Yet to Pay" value={money(advanceMetrics.approvedUnpaid)} status="approved" caption="Finance payment pending" icon={FileCheck} tone="bg-blue-50 text-blue-700" />
            <StatCard title="Total Paid Advances" value={money(advanceMetrics.paid)} status="paid" caption="Advances paid to employees/vendors" icon={IndianRupee} tone="bg-emerald-50 text-emerald-700" />
            <StatCard title="Rejected Requests" value={advanceMetrics.rejected} status="rejected" caption="Rejected with audit comments" icon={XCircle} tone="bg-rose-50 text-rose-700" />
            <StatCard title="Recovery Pending" value={money(advanceMetrics.recovery)} status="pending" caption="Salary recovery or settlement pending" icon={Banknote} tone="bg-slate-50 text-slate-700" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniBarChart title={currentType === 'expense' ? 'Monthly expenses' : 'Monthly advances'} rows={monthRows.length ? monthRows : [{ label: 'No data', value: 0 }]} />
        <MiniBarChart title={currentType === 'expense' ? 'Department/category expenses' : 'Advance recovery status'} rows={categoryRows.length ? categoryRows : [{ label: 'No data', value: 0 }]} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="athens-input pl-9" placeholder="Search employee, category, project, reason" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="athens-input min-w-[180px]">
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reimbursed">Reimbursed</option>
              <option value="partial_reimbursed">Partial Reimbursed</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={exportRows} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground">Loading finance workflow...</div>
      ) : (
        <FinanceTable rows={filteredRows} type={currentType} sortKey={sortKey} sortDir={sortDir} setSort={setSort} page={page} setPage={setPage} onApprove={approve} onReject={setRejectTarget} onReimburse={reimburse} onPayAdvance={payAdvance} onEscalate={escalate} busyId={busyId} />
      )}

      <RequestModal type={modalType || currentType} open={!!modalType} onClose={closeModal} onCreated={(row) => setRows((prev) => [row, ...prev])} />
      <RejectModal row={rejectTarget} loading={rejecting} onClose={() => setRejectTarget(null)} onConfirm={reject} />
    </div>
  )
}
