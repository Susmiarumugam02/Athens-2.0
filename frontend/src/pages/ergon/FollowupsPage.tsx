import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  User,
  Users,
  Video,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'

type FollowupStatus = 'open' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'escalated' | 'cancelled' | 'rescheduled'
type Priority = 'low' | 'medium' | 'high' | 'critical'
type FollowupType = 'standalone' | 'task' | 'client' | 'vendor' | 'employee' | 'inspection' | 'incident' | 'capa' | 'quality'

interface Contact {
  id: number
  name?: string
  contact_person?: string
  phone?: string
  email?: string
  company?: string
  designation?: string
  status?: string
}

interface TaskOption {
  id: number
  title: string
  status?: string
  priority?: string
}

interface HistoryItem {
  id: number
  action: string
  notes?: string
  old_value?: string
  new_value?: string
  created_by_name?: string
  created_at: string
}

interface Followup {
  id: number
  followup_type: FollowupType
  contact?: number | null
  contact_name?: string
  title: string
  description: string
  followup_date: string
  due_date?: string | null
  priority?: Priority
  status: FollowupStatus
  assigned_to?: number | null
  assigned_to_name?: string | null
  task?: number | null
  linked_task_title?: string | null
  linked_project_id?: number | null
  linked_department?: string
  linked_module?: string
  related_incident?: string
  related_inspection?: string
  related_quality_finding?: string
  escalation_user?: number | null
  escalation_user_name?: string | null
  reminder_enabled?: boolean
  reminder_time?: string | null
  reminder_frequency?: string
  escalation_delay?: number
  followup_method?: string
  meeting_notes?: string
  comments?: string
  attachments?: string
  completion_notes?: string
  completed_at?: string | null
  company: string
  contact_person: string
  phone: string
  project_name: string
  created_by_name: string
  created_at: string
}

interface FormState {
  followup_type: FollowupType
  contact: string
  followup_date: string
  title: string
  description: string
  priority: Priority
  status: FollowupStatus
  task: string
  linked_project_id: string
  linked_department: string
  linked_module: string
  related_incident: string
  related_inspection: string
  related_quality_finding: string
  reminder_enabled: boolean
  reminder_time: string
  reminder_frequency: string
  escalation_user: string
  escalation_delay: string
  followup_method: string
  meeting_notes: string
  attachments: string
  comments: string
  company: string
  contact_person: string
  phone: string
  project_name: string
}

const emptyForm: FormState = {
  followup_type: 'standalone',
  contact: '',
  followup_date: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  priority: 'medium',
  status: 'scheduled',
  task: '',
  linked_project_id: '',
  linked_department: '',
  linked_module: '',
  related_incident: '',
  related_inspection: '',
  related_quality_finding: '',
  reminder_enabled: true,
  reminder_time: '',
  reminder_frequency: 'once',
  escalation_user: '',
  escalation_delay: '24',
  followup_method: 'call',
  meeting_notes: '',
  attachments: '',
  comments: '',
  company: '',
  contact_person: '',
  phone: '',
  project_name: '',
}

const followupTypes: Array<{ value: FollowupType; label: string }> = [
  { value: 'standalone', label: 'Standalone Follow-up' },
  { value: 'task', label: 'Task Follow-up' },
  { value: 'client', label: 'Client Follow-up' },
  { value: 'vendor', label: 'Vendor Follow-up' },
  { value: 'employee', label: 'Employee Follow-up' },
  { value: 'inspection', label: 'Inspection Follow-up' },
  { value: 'incident', label: 'Incident Follow-up' },
  { value: 'capa', label: 'CAPA Follow-up' },
  { value: 'quality', label: 'Quality Follow-up' },
]

const methods = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'site_visit', label: 'Site Visit', icon: Briefcase },
  { value: 'video_conference', label: 'Video Conference', icon: Video },
]

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.results)) return record.results as T[]
  }
  return []
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) return (data as { data: T }).data
  return data as T
}

function apiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return fallback
  const payload = data as Record<string, unknown>
  if (typeof payload.detail === 'string') return payload.detail
  if (typeof payload.message === 'string') return payload.message
  const first = Object.values(payload).flat()[0]
  return typeof first === 'string' ? first : fallback
}

function isOverdue(item: Followup): boolean {
  if (['completed', 'cancelled'].includes(item.status)) return false
  return new Date(`${item.followup_date}T00:00:00`) < new Date(new Date().toDateString())
}

function effectiveStatus(item: Followup): FollowupStatus {
  if (isOverdue(item)) return 'overdue'
  return item.status
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusLabel(value: FollowupStatus): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const statusStyles: Record<FollowupStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  scheduled: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  escalated: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  rescheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const priorityStyles: Record<Priority, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  critical: 'bg-red-200 text-red-900 dark:bg-red-950/50 dark:text-red-200',
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>
}

function KpiCard({ title, value, helper, icon, tone }: { title: string; value: number; helper: string; icon: ReactNode; tone: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`w-fit rounded-lg p-2.5 ${tone}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary disabled:opacity-60'
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

function toForm(item: Followup): FormState {
  return {
    ...emptyForm,
    followup_type: item.followup_type || 'standalone',
    contact: item.contact ? String(item.contact) : '',
    followup_date: item.followup_date,
    title: item.title || '',
    description: item.description || '',
    priority: item.priority || 'medium',
    status: item.status || 'scheduled',
    task: item.task ? String(item.task) : '',
    linked_project_id: item.linked_project_id ? String(item.linked_project_id) : '',
    linked_department: item.linked_department || '',
    linked_module: item.linked_module || '',
    related_incident: item.related_incident || '',
    related_inspection: item.related_inspection || '',
    related_quality_finding: item.related_quality_finding || '',
    reminder_enabled: item.reminder_enabled ?? true,
    reminder_time: item.reminder_time ? item.reminder_time.slice(0, 16) : '',
    reminder_frequency: item.reminder_frequency || 'once',
    escalation_user: item.escalation_user ? String(item.escalation_user) : '',
    escalation_delay: String(item.escalation_delay ?? 24),
    followup_method: item.followup_method || 'call',
    meeting_notes: item.meeting_notes || '',
    attachments: item.attachments || '',
    comments: item.comments || '',
    company: item.company || '',
    contact_person: item.contact_person || item.contact_name || '',
    phone: item.phone || '',
    project_name: item.project_name || '',
  }
}

function buildPayload(form: FormState) {
  return {
    followup_type: form.followup_type,
    contact: form.contact ? Number(form.contact) : null,
    followup_date: form.followup_date,
    due_date: form.followup_date,
    title: form.title.trim(),
    description: form.description.trim(),
    priority: form.priority,
    status: form.status,
    task: form.task ? Number(form.task) : null,
    linked_project_id: form.linked_project_id ? Number(form.linked_project_id) : null,
    linked_department: form.linked_department.trim(),
    linked_module: form.linked_module.trim(),
    related_incident: form.related_incident.trim(),
    related_inspection: form.related_inspection.trim(),
    related_quality_finding: form.related_quality_finding.trim(),
    reminder_enabled: form.reminder_enabled,
    reminder_time: form.reminder_time ? new Date(form.reminder_time).toISOString() : null,
    reminder_frequency: form.reminder_frequency,
    escalation_user: form.escalation_user ? Number(form.escalation_user) : null,
    escalation_delay: Number(form.escalation_delay) || 0,
    followup_method: form.followup_method,
    meeting_notes: form.meeting_notes.trim(),
    attachments: form.attachments.trim(),
    comments: form.comments.trim(),
    company: form.company.trim(),
    contact_person: form.contact_person.trim(),
    phone: form.phone.trim(),
    project_name: form.project_name.trim(),
  }
}

export default function FollowupsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isCreate = location.pathname.endsWith('/create')
  const isEdit = location.pathname.includes('/edit/')
  const isDetail = Boolean(id) && !isEdit
  const isForm = isCreate || isEdit

  const [followups, setFollowups] = useState<Followup[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | FollowupStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'created'>('due')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [quickContact, setQuickContact] = useState({ name: '', phone: '', email: '', company: '', designation: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [followupRes, contactRes, taskRes] = await Promise.all([
        ergonApi.getFollowups(),
        ergonApi.getContacts(),
        ergonApi.getTasks({ page_size: 200 }),
      ])
      setFollowups(extractList<Followup>(followupRes.data))
      setContacts(extractList<Contact>(contactRes.data))
      setTasks(extractList<TaskOption>(taskRes.data))
    } catch (error: unknown) {
      toast.error(apiError(error, 'Failed to load follow-up workspace'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const selected = useMemo(() => followups.find((item) => String(item.id) === id), [followups, id])

  useEffect(() => {
    if (isCreate) setForm(emptyForm)
    if (isEdit && selected) setForm(toForm(selected))
  }, [isCreate, isEdit, selected])

  useEffect(() => {
    if (!isDetail || !id) return
    ergonApi.getFollowupHistory(id)
      .then((response) => setHistory(extractList<HistoryItem>(response.data)))
      .catch(() => setHistory([]))
  }, [isDetail, id])

  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      contacts: contacts.length,
      active: followups.filter((item) => ['open', 'pending', 'scheduled', 'in_progress', 'rescheduled'].includes(item.status)).length,
      overdue: followups.filter(isOverdue).length,
      dueToday: followups.filter((item) => item.followup_date === today && !['completed', 'cancelled'].includes(item.status)).length,
      completed: followups.filter((item) => item.status === 'completed').length,
      escalated: followups.filter((item) => item.status === 'escalated').length,
    }
  }, [contacts.length, followups])

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return followups
      .filter((item) => {
        const matchesSearch = !q || [item.title, item.contact_person, item.contact_name, item.company, item.phone, item.linked_task_title]
          .some((value) => (value || '').toLowerCase().includes(q))
        const matchesStatus = statusFilter === 'all' || effectiveStatus(item) === statusFilter
        const matchesPriority = priorityFilter === 'all' || (item.priority || 'medium') === priorityFilter
        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const order = { critical: 0, high: 1, medium: 2, low: 3 }
          return order[(a.priority || 'medium') as Priority] - order[(b.priority || 'medium') as Priority]
        }
        if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return new Date(a.followup_date).getTime() - new Date(b.followup_date).getTime()
      })
  }, [followups, priorityFilter, searchTerm, sortBy, statusFilter])

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectContact = (contactId: string) => {
    const contact = contacts.find((item) => String(item.id) === contactId)
    setForm((prev) => ({
      ...prev,
      contact: contactId,
      contact_person: contact?.name || contact?.contact_person || prev.contact_person,
      company: contact?.company || prev.company,
      phone: contact?.phone || prev.phone,
    }))
  }

  const saveFollowup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) { toast.error('Follow-up title is required'); return }
    if (!form.followup_date) { toast.error('Follow-up date is required'); return }
    if (!form.contact && !form.contact_person.trim()) { toast.error('Select or create a contact'); return }
    setSaving(true)
    try {
      const payload = buildPayload(form)
      const response = isEdit && id
        ? await ergonApi.updateFollowup(Number(id), payload)
        : await ergonApi.createFollowup(payload)
      const saved = unwrap<Followup>(response.data)
      setFollowups((prev) => isEdit ? prev.map((item) => item.id === saved.id ? saved : item) : [saved, ...prev])
      toast.success(isEdit ? 'Follow-up updated' : 'Follow-up created')
      navigate(`/app/followups/${saved.id}`)
    } catch (error: unknown) {
      toast.error(apiError(error, 'Failed to save follow-up'))
    } finally {
      setSaving(false)
    }
  }

  const addQuickContact = async () => {
    if (!quickContact.name.trim()) { toast.error('Contact name is required'); return }
    setSaving(true)
    try {
      const response = await ergonApi.createContact({
        name: quickContact.name.trim(),
        contact_person: quickContact.name.trim(),
        phone: quickContact.phone.trim(),
        email: quickContact.email.trim(),
        company: quickContact.company.trim(),
        designation: quickContact.designation.trim(),
        status: 'active',
      })
      const created = unwrap<Contact>(response.data)
      setContacts((prev) => [created, ...prev])
      setQuickContact({ name: '', phone: '', email: '', company: '', designation: '' })
      selectContact(String(created.id))
      setForm((prev) => ({
        ...prev,
        contact: String(created.id),
        contact_person: created.name || created.contact_person || '',
        company: created.company || '',
        phone: created.phone || '',
      }))
      toast.success('Contact added and selected')
    } catch (error: unknown) {
      toast.error(apiError(error, 'Failed to add contact'))
    } finally {
      setSaving(false)
    }
  }

  const completeFollowup = async (item: Followup) => {
    setActionId(item.id)
    try {
      const response = await ergonApi.completeFollowup(String(item.id), { completion_notes: 'Completed from follow-up dashboard' })
      const updated = unwrap<Followup>(response.data)
      setFollowups((prev) => prev.map((followup) => followup.id === item.id ? updated : followup))
      toast.success('Follow-up completed')
    } catch (error: unknown) {
      toast.error(apiError(error, 'Failed to complete follow-up'))
    } finally {
      setActionId(null)
    }
  }

  const deleteFollowup = async (item: Followup) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setActionId(item.id)
    try {
      await ergonApi.deleteFollowup(item.id)
      setFollowups((prev) => prev.filter((followup) => followup.id !== item.id))
      toast.success('Follow-up deleted')
    } catch (error: unknown) {
      toast.error(apiError(error, 'Failed to delete follow-up'))
    } finally {
      setActionId(null)
    }
  }

  if (isForm) {
    return (
      <div className="min-h-full bg-background p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate('/app/followups')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button form="followup-form" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isEdit ? 'Save Follow-up' : 'Create Follow-up'}
          </button>
        </div>

        <form id="followup-form" onSubmit={saveFollowup} className="space-y-5">
          <Section title="Follow-up Details" icon={<FileText className="h-4 w-4" />}>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <label><span className={labelClass}>Follow-up Type</span><select value={form.followup_type} onChange={(event) => setField('followup_type', event.target.value as FollowupType)} className={inputClass}>{followupTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className={labelClass}>Contact</span><select value={form.contact} onChange={(event) => selectContact(event.target.value)} className={inputClass}><option value="">Select contact</option>{contacts.map((item) => <option key={item.id} value={item.id}>{item.name || item.contact_person} {item.company ? `- ${item.company}` : ''}</option>)}</select></label>
              <label><span className={labelClass}>Follow-up Date</span><input type="date" required value={form.followup_date} onChange={(event) => setField('followup_date', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Priority</span><select value={form.priority} onChange={(event) => setField('priority', event.target.value as Priority)} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
              <label><span className={labelClass}>Status</span><select value={form.status} onChange={(event) => setField('status', event.target.value as FollowupStatus)} className={inputClass}><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="escalated">Escalated</option><option value="cancelled">Cancelled</option></select></label>
              <label className="md:col-span-2"><span className={labelClass}>Title</span><input required value={form.title} onChange={(event) => setField('title', event.target.value)} className={inputClass} placeholder="Follow-up title" /></label>
              <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea rows={4} value={form.description} onChange={(event) => setField('description', event.target.value)} className={inputClass} placeholder="Objective, context, and expected outcome" /></label>
            </div>
          </Section>

          <Section title="Linked Workflow" icon={<Briefcase className="h-4 w-4" />}>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <label><span className={labelClass}>Linked Task</span><select value={form.task} onChange={(event) => setField('task', event.target.value)} className={inputClass}><option value="">No linked task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
              <label><span className={labelClass}>Linked Project ID</span><input value={form.linked_project_id} onChange={(event) => setField('linked_project_id', event.target.value)} className={inputClass} placeholder="Project reference" /></label>
              <label><span className={labelClass}>Linked Department</span><input value={form.linked_department} onChange={(event) => setField('linked_department', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Linked Module</span><select value={form.linked_module} onChange={(event) => setField('linked_module', event.target.value)} className={inputClass}><option value="">Select module</option><option value="ptw">PTW</option><option value="incident">Incident</option><option value="inspection">Inspection</option><option value="quality">Quality Finding</option><option value="capa">CAPA</option><option value="training">Training</option><option value="vendor">Vendor</option><option value="client">Client</option></select></label>
              <label><span className={labelClass}>Related Incident</span><input value={form.related_incident} onChange={(event) => setField('related_incident', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Related Inspection</span><input value={form.related_inspection} onChange={(event) => setField('related_inspection', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Related Quality Finding</span><input value={form.related_quality_finding} onChange={(event) => setField('related_quality_finding', event.target.value)} className={inputClass} /></label>
            </div>
          </Section>

          <Section title="Reminder Settings" icon={<Bell className="h-4 w-4" />}>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3"><input type="checkbox" checked={form.reminder_enabled} onChange={(event) => setField('reminder_enabled', event.target.checked)} className="h-4 w-4" /><span className="text-sm font-medium text-foreground">Reminder Enabled</span></label>
              <label><span className={labelClass}>Reminder Time</span><input type="datetime-local" value={form.reminder_time} onChange={(event) => setField('reminder_time', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Reminder Frequency</span><select value={form.reminder_frequency} onChange={(event) => setField('reminder_frequency', event.target.value)} className={inputClass}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="before_due">Before Due Date</option><option value="on_due">On Due Date</option></select></label>
              <label><span className={labelClass}>Escalation Delay (hours)</span><input type="number" min={0} value={form.escalation_delay} onChange={(event) => setField('escalation_delay', event.target.value)} className={inputClass} /></label>
            </div>
          </Section>

          <Section title="Communication Details" icon={<MessageSquare className="h-4 w-4" />}>
            <div className="mb-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {methods.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setField('followup_method', value)} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${form.followup_method === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-accent'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <label><span className={labelClass}>Contact Person</span><input value={form.contact_person} onChange={(event) => setField('contact_person', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Phone</span><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Company</span><input value={form.company} onChange={(event) => setField('company', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Project / Reference</span><input value={form.project_name} onChange={(event) => setField('project_name', event.target.value)} className={inputClass} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Meeting Notes</span><textarea rows={3} value={form.meeting_notes} onChange={(event) => setField('meeting_notes', event.target.value)} className={inputClass} /></label>
              <label><span className={labelClass}>Attachments</span><input value={form.attachments} onChange={(event) => setField('attachments', event.target.value)} className={inputClass} placeholder="File reference or URL" /></label>
              <label><span className={labelClass}>Comments</span><input value={form.comments} onChange={(event) => setField('comments', event.target.value)} className={inputClass} /></label>
            </div>
          </Section>

          <Section title="Don't see your contact?" icon={<User className="h-4 w-4" />}>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <input value={quickContact.name} onChange={(event) => setQuickContact((prev) => ({ ...prev, name: event.target.value }))} className={inputClass} placeholder="Name" />
              <input value={quickContact.phone} onChange={(event) => setQuickContact((prev) => ({ ...prev, phone: event.target.value }))} className={inputClass} placeholder="Phone" />
              <input value={quickContact.email} onChange={(event) => setQuickContact((prev) => ({ ...prev, email: event.target.value }))} className={inputClass} placeholder="Email" />
              <input value={quickContact.company} onChange={(event) => setQuickContact((prev) => ({ ...prev, company: event.target.value }))} className={inputClass} placeholder="Company" />
              <input value={quickContact.designation} onChange={(event) => setQuickContact((prev) => ({ ...prev, designation: event.target.value }))} className={inputClass} placeholder="Designation" />
              <button type="button" disabled={saving} onClick={addQuickContact} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"><Plus className="h-4 w-4" /> Add Contact & Select</button>
            </div>
          </Section>
        </form>
      </div>
    )
  }

  if (isDetail) {
    return (
      <div className="min-h-full bg-background p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate('/app/followups')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /> Back</button>
          {selected && <button onClick={() => navigate(`/app/followups/edit/${selected.id}`)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Edit2 className="h-4 w-4" /> Edit</button>}
        </div>
        {!selected ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">{loading ? 'Loading follow-up...' : 'Follow-up not found.'}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="space-y-5">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge className={statusStyles[effectiveStatus(selected)]}>{statusLabel(effectiveStatus(selected))}</Badge>
                      <Badge className={priorityStyles[(selected.priority || 'medium') as Priority]}>{selected.priority || 'medium'}</Badge>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">{selected.title}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{selected.description || 'No description provided.'}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Follow-up ID: FUP-{String(selected.id).padStart(5, '0')}</div>
                    <div>Due: {formatDate(selected.followup_date)}</div>
                  </div>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-foreground">Activity Timeline</h2>
                <div className="space-y-3">
                  {(history.length ? history : [{ id: 0, action: 'created', notes: 'Follow-up created', created_at: selected.created_at, created_by_name: selected.created_by_name }]).map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{statusLabel(item.action as FollowupStatus) || item.action}</div>
                        <div className="text-xs text-muted-foreground">{item.notes || [item.old_value, item.new_value].filter(Boolean).join(' to ')}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} {item.created_by_name ? `by ${item.created_by_name}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>
            <aside className="space-y-4">
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Contact</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selected.contact_name || selected.contact_person || '-'}</div>
                  <div>{selected.company || '-'}</div>
                  <div>{selected.phone || '-'}</div>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Workflow Links</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Task: {selected.linked_task_title || '-'}</div>
                  <div>Module: {selected.linked_module || '-'}</div>
                  <div>Department: {selected.linked_department || '-'}</div>
                  <div>Assigned: {selected.assigned_to_name || selected.created_by_name || '-'}</div>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Reminder Engine</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Reminder: {selected.reminder_enabled ? 'Enabled' : 'Disabled'}</div>
                  <div>Frequency: {selected.reminder_frequency || '-'}</div>
                  <div>Escalation delay: {selected.escalation_delay || 0} hours</div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-6 bg-background p-4 md:p-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Bell className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">Follow-up Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">Contact follow-ups, reminders, escalations, and linked workflow tracking.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button onClick={() => navigate('/app/followups/create')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><User className="h-4 w-4" /> Add Contact</button>
            <button onClick={() => navigate('/app/followups/create')} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md"><Plus className="h-4 w-4" /> New Follow-up</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <KpiCard title="Total Contacts" value={metrics.contacts} helper="Contact directory" icon={<Users className="h-4 w-4" />} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
        <KpiCard title="Active Follow-ups" value={metrics.active} helper="Open workflow" icon={<Clock className="h-4 w-4" />} tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <KpiCard title="Overdue Follow-ups" value={metrics.overdue} helper="Needs attention" icon={<AlertCircle className="h-4 w-4" />} tone="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
        <KpiCard title="Due Today" value={metrics.dueToday} helper="Scheduled today" icon={<Calendar className="h-4 w-4" />} tone="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" />
        <KpiCard title="Completed" value={metrics.completed} helper="Closed follow-ups" icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <KpiCard title="Escalated" value={metrics.escalated} helper="Escalation queue" icon={<ShieldAlert className="h-4 w-4" />} tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1) }} placeholder="Search contact, title, company, task..." className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | FollowupStatus); setPage(1) }} className={inputClass}><option value="all">All Status</option><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="overdue">Overdue</option><option value="completed">Completed</option><option value="escalated">Escalated</option><option value="cancelled">Cancelled</option></select>
          <select value={priorityFilter} onChange={(event) => { setPriorityFilter(event.target.value as 'all' | Priority); setPage(1) }} className={inputClass}><option value="all">All Priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'due' | 'priority' | 'created')} className={inputClass}><option value="due">Sort by Due Date</option><option value="priority">Sort by Priority</option><option value="created">Sort by Created</option></select>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading follow-ups...</div>
        ) : paged.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No follow-ups match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {['Follow-up ID', 'Contact Name', 'Follow-up Title', 'Type', 'Due Date', 'Priority', 'Status', 'Assigned User', 'Linked Task', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((item) => {
                  const status = effectiveStatus(item)
                  const busy = actionId === item.id
                  return (
                    <tr key={item.id} className={`hover:bg-accent/50 ${status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">FUP-{String(item.id).padStart(5, '0')}</td>
                      <td className="px-4 py-3 text-foreground">{item.contact_name || item.contact_person || '-'}</td>
                      <td className="min-w-[260px] px-4 py-3"><button onClick={() => navigate(`/app/followups/${item.id}`)} className="font-medium text-foreground hover:text-primary">{item.title}</button><div className="line-clamp-1 text-xs text-muted-foreground">{item.description}</div></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{followupTypes.find((type) => type.value === item.followup_type)?.label || item.followup_type}</td>
                      <td className={`whitespace-nowrap px-4 py-3 ${status === 'overdue' ? 'font-semibold text-red-600 dark:text-red-300' : 'text-muted-foreground'}`}>{formatDate(item.followup_date)}</td>
                      <td className="px-4 py-3"><Badge className={priorityStyles[(item.priority || 'medium') as Priority]}>{item.priority || 'medium'}</Badge></td>
                      <td className="px-4 py-3"><Badge className={statusStyles[status]}>{statusLabel(status)}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{item.assigned_to_name || item.created_by_name || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.linked_task_title || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/app/followups/${item.id}`)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="View"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => navigate(`/app/followups/edit/${item.id}`)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          {!['completed', 'cancelled'].includes(item.status) && <button disabled={busy} onClick={() => completeFollowup(item)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Complete"><CheckCircle2 className="h-4 w-4" /></button>}
                          <button disabled={busy} onClick={() => deleteFollowup(item)} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>Showing {paged.length} of {filtered.length} follow-ups</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">Next</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ChevronRight className="h-4 w-4" /> Reminder Engine</div>
        <p className="mt-2 text-sm text-muted-foreground">Email reminders, in-app reminders, overdue alerts, escalation notifications, and scheduled reminder metadata are captured on each follow-up for backend notification processing.</p>
      </section>
    </div>
  )
}
