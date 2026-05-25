import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  Edit2,
  Filter,
  Flag,
  FolderKanban,
  Link2,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { ergonApi } from '@/services/ergonApi'
import apiClient from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

type TaskStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'suspended'
type TaskPriority = 'low' | 'medium' | 'high'
type TaskType = 'ad-hoc' | 'checklist' | 'milestone' | 'timed'

interface Task {
  id: number
  title: string
  description: string
  task_type?: TaskType
  status: TaskStatus
  priority: TaskPriority
  progress?: number
  assigned_by?: number | null
  assigned_by_name?: string
  assigned_to?: number | null
  assigned_to_name?: string
  project?: number | null
  project_name?: string
  department?: number | null
  task_category?: number | null
  planned_date?: string | null
  due_date?: string | null
  deadline?: string | null
  sla_hours?: string | number | null
  depends_on_task?: number | null
  followup_required?: boolean
  reminder_notifications?: boolean
  track_time?: boolean
  is_recurring?: boolean
  created_at?: string
  updated_at?: string
}

interface Project { id: number; name: string }
interface Department { id: number; name: string; project?: number }
interface TaskCategory { id: number; name: string; department?: number }
interface ErgonUser { id: number; email: string; name?: string; username?: string }

interface FormState {
  title: string
  description: string
  task_type: TaskType
  task_category: string
  assigned_to: string
  assignment_type: string
  planned_date: string
  due_date: string
  reminder_notifications: boolean
  project: string
  department: string
  priority: TaskPriority
  status: TaskStatus
  tags: string
  sla_hours: string
  estimated_hours: string
  progress: string
  depends_on_task: string
  followup_required: boolean
  is_recurring: boolean
  notifications: boolean
  track_time: boolean
}

interface Filters {
  search: string
  priority: string
  status: string
  assignee: string
  department: string
  dueFrom: string
  dueTo: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  task_type: 'ad-hoc',
  task_category: '',
  assigned_to: '',
  assignment_type: 'individual',
  planned_date: '',
  due_date: '',
  reminder_notifications: true,
  project: '',
  department: '',
  priority: 'medium',
  status: 'assigned',
  tags: '',
  sla_hours: '0.25',
  estimated_hours: '',
  progress: '0',
  depends_on_task: '',
  followup_required: false,
  is_recurring: false,
  notifications: true,
  track_time: false,
}

const EMPTY_FILTERS: Filters = {
  search: '',
  priority: 'all',
  status: 'all',
  assignee: 'all',
  department: 'all',
  dueFrom: '',
  dueTo: '',
}

const statusLabels: Record<TaskStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
}

const statusStyles: Record<TaskStatus, string> = {
  assigned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data
    if (Array.isArray(record.results)) return record.results
  }
  return []
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed') return false
  const due = new Date(`${task.due_date}T23:59:59`)
  return due.getTime() < Date.now()
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function userLabel(user: ErgonUser): string {
  return user.name || user.username || user.email
}

function taskProgress(task: Task): number {
  if (typeof task.progress === 'number') return Math.max(0, Math.min(100, task.progress))
  if (task.status === 'completed') return 100
  if (task.status === 'in_progress') return 50
  return 0
}

function getApiError(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: unknown } })?.response?.data
  if (!response) return fallback
  if (typeof response === 'string') return response
  if (typeof response !== 'object') return fallback
  const payload = response as Record<string, unknown>
  if (typeof payload.message === 'string') return payload.message
  if (typeof payload.error === 'string') return payload.error
  if (typeof payload.detail === 'string') return payload.detail
  for (const [field, value] of Object.entries(payload)) {
    const messages = Array.isArray(value) ? value : [value]
    const first = messages.find((item) => item !== null && item !== undefined)
    if (first) return `${field.replaceAll('_', ' ')}: ${String(first)}`
  }
  return fallback
}

function KpiCard({
  title,
  value,
  icon,
  tone,
  subtext,
  progress,
}: {
  title: string
  value: number
  icon: React.ReactNode
  tone: string
  subtext: string
  progress: number
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`p-2.5 rounded-lg ${tone}`}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="mt-4 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
      <div className="mt-3 h-1.5 rounded-full bg-accent overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string
  required?: boolean
  helper?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {helper && <span className="mt-1 block text-xs text-muted-foreground">{helper}</span>}
    </label>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        {children}
      </div>
    </section>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-accent/60 transition-colors"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60'

function TaskFormPanel({
  title,
  initialValues,
  projects,
  departments,
  categories,
  tasks,
  users,
  loading,
  hideProject,
  onClose,
  onSubmit,
}: {
  title: string
  initialValues: FormState
  projects: Project[]
  departments: Department[]
  categories: TaskCategory[]
  tasks: Task[]
  users: ErgonUser[]
  loading: boolean
  hideProject: boolean
  onClose: () => void
  onSubmit: (values: FormState) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(initialValues)

  useEffect(() => {
    setForm(initialValues)
  }, [initialValues])

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const availableDepartments = departments.filter((department) => !form.project || String(department.project ?? '') === form.project || !department.project)
  const availableCategories = categories.filter((category) => !form.department || String(category.department ?? '') === form.department || !category.department)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) { toast.error('Task title is required'); return }
    if (!hideProject && !form.project) { toast.error('Project is required'); return }
    if (!form.due_date) { toast.error('Due date is required'); return }
    const progress = Number(form.progress)
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error('Progress must be between 0 and 100')
      return
    }
    await onSubmit(form)
  }

  return (
    <div className="bg-background border border-border rounded-xl p-4 md:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure task ownership, schedule, controls, and tracking.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="Task Details" icon={<CheckSquare className="h-4 w-4" />}>
          <Field label="Task Title" required>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Enter task title" />
          </Field>
          <Field label="Task Type">
            <select value={form.task_type} onChange={(e) => set('task_type', e.target.value as TaskType)} className={inputCls}>
              <option value="ad-hoc">Task</option>
              <option value="checklist">Checklist</option>
              <option value="milestone">Milestone</option>
              <option value="timed">Urgent</option>
            </select>
          </Field>
          <Field label="Category">
            <select value={form.task_category} onChange={(e) => set('task_category', e.target.value)} className={inputCls}>
              <option value="">Select category</option>
              {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="Add task context, acceptance criteria, or handover notes" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Assignment & Schedule" icon={<Calendar className="h-4 w-4" />}>
          <Field label="Assign To">
            <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} className={inputCls}>
              <option value="">Select assignee</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
            </select>
          </Field>
          <Field label="Assignment Type">
            <select value={form.assignment_type} onChange={(e) => set('assignment_type', e.target.value)} className={inputCls}>
              <option value="individual">Individual</option>
              <option value="department">Department</option>
              <option value="project">Project Team</option>
            </select>
          </Field>
          <Field label="Start Date">
            <input type="date" value={form.planned_date} onChange={(e) => set('planned_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Due Date" required>
            <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Reminder Settings">
            <ToggleField label="Send reminders" checked={form.reminder_notifications} onChange={(value) => set('reminder_notifications', value)} />
          </Field>
        </SectionCard>

        <SectionCard title="Task Configuration" icon={<Settings2 className="h-4 w-4" />}>
          {!hideProject && (
            <Field label="Project" required>
              <select value={form.project} onChange={(e) => { set('project', e.target.value); set('department', ''); set('task_category', '') }} className={inputCls}>
                <option value="">Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Department">
            <select value={form.department} onChange={(e) => { set('department', e.target.value); set('task_category', '') }} className={inputCls}>
              <option value="">Select department</option>
              {availableDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)} className={inputCls}>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <Field label="Tags">
            <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className={inputCls} placeholder="Safety, QA, handover" />
          </Field>
        </SectionCard>

        <SectionCard title="Timeline & Progress" icon={<BarChart3 className="h-4 w-4" />}>
          <Field label="SLA">
            <input type="number" min="0" step="0.25" value={form.sla_hours} onChange={(e) => set('sla_hours', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Estimated Hours">
            <input type="number" min="0" step="0.25" value={form.estimated_hours} onChange={(e) => set('estimated_hours', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Progress %">
            <input type="number" min="0" max="100" value={form.progress} onChange={(e) => set('progress', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Dependencies">
            <select value={form.depends_on_task} onChange={(e) => set('depends_on_task', e.target.value)} className={inputCls}>
              <option value="">No dependency</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>#{task.id} - {task.title}</option>)}
            </select>
          </Field>
        </SectionCard>

        <SectionCard title="Additional Options" icon={<SlidersHorizontal className="h-4 w-4" />}>
          <ToggleField label="Follow-up Required" checked={form.followup_required} onChange={(value) => set('followup_required', value)} />
          <ToggleField label="Recurring Task" checked={form.is_recurring} onChange={(value) => set('is_recurring', value)} />
          <ToggleField label="Notifications" checked={form.notifications} onChange={(value) => set('notifications', value)} />
          <ToggleField label="Track Time" checked={form.track_time} onChange={(value) => set('track_time', value)} />
        </SectionCard>

        <div className="sticky bottom-0 z-10 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-4 bg-background/95 backdrop-blur border-t border-border rounded-b-xl">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving Task' : 'Save Task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function DeleteModal({
  open,
  taskTitle,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  taskTitle: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Delete Task</h2>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-medium text-foreground">"{taskTitle}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 text-sm font-medium"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 disabled:opacity-60 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function toFormState(task: Task | null): FormState {
  if (!task) return EMPTY_FORM
  return {
    title: task.title ?? '',
    description: task.description ?? '',
    task_type: task.task_type ?? 'ad-hoc',
    task_category: task.task_category ? String(task.task_category) : '',
    assigned_to: task.assigned_to ? String(task.assigned_to) : '',
    assignment_type: 'individual',
    planned_date: task.planned_date ?? '',
    due_date: task.due_date ?? '',
    reminder_notifications: task.reminder_notifications ?? true,
    project: task.project ? String(task.project) : '',
    department: task.department ? String(task.department) : '',
    priority: task.priority ?? 'medium',
    status: task.status ?? 'assigned',
    tags: '',
    sla_hours: task.sla_hours ? String(task.sla_hours) : '0.25',
    estimated_hours: '',
    progress: String(taskProgress(task)),
    depends_on_task: task.depends_on_task ? String(task.depends_on_task) : '',
    followup_required: task.followup_required ?? false,
    is_recurring: task.is_recurring ?? false,
    notifications: task.reminder_notifications ?? true,
    track_time: task.track_time ?? false,
  }
}

function buildTaskPayload(values: FormState, hideProject: boolean) {
  const payload: Record<string, string | number | boolean | null> = {
    title: values.title.trim(),
    description: values.description.trim(),
    task_type: values.task_type,
    assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
    due_date: values.due_date || null,
    planned_date: values.planned_date || null,
    priority: values.priority,
    status: values.status,
    progress: Number(values.progress || 0),
    sla_hours: values.sla_hours ? Number(values.sla_hours) : 0.25,
    department: values.department ? Number(values.department) : null,
    task_category: values.task_category ? Number(values.task_category) : null,
    depends_on_task: values.depends_on_task ? Number(values.depends_on_task) : null,
    followup_required: values.followup_required,
    reminder_notifications: values.reminder_notifications && values.notifications,
    track_time: values.track_time,
    is_recurring: values.is_recurring,
  }
  if (!hideProject && values.project) payload.project = Number(values.project)
  return payload
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

function PriorityPill({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${priorityStyles[priority]}`}>
      {priority}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-accent overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function TaskManagementPage() {
  const user = useAuthStore((state) => state.user)
  const currentUserId = Number((user as { id?: number } | null)?.id ?? 0)
  const userType = (user as { user_type?: string } | null)?.user_type
  const hideProject = userType !== 'masteradmin' && userType !== 'superadmin'

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [users, setUsers] = useState<ErgonUser[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'overdue'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table')
  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filters.search) params.search = filters.search
      if (filters.status !== 'all') params.status = filters.status
      if (filters.priority !== 'all') params.priority = filters.priority
      const response = await ergonApi.getTasks(params)
      setTasks(extractList(response.data) as Task[])
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load tasks'))
    } finally {
      setLoading(false)
    }
  }

  const fetchDropdowns = async () => {
    try {
      const [projectResponse, departmentResponse, categoryResponse, usersResponse] = await Promise.allSettled([
        ergonApi.getProjects(),
        ergonApi.getDepartments(),
        ergonApi.getTaskCategories(),
        apiClient.get('/api/auth/users/'),
      ])
      if (projectResponse.status === 'fulfilled') setProjects(extractList(projectResponse.value.data) as Project[])
      if (departmentResponse.status === 'fulfilled') setDepartments(extractList(departmentResponse.value.data) as Department[])
      if (categoryResponse.status === 'fulfilled') setCategories(extractList(categoryResponse.value.data) as TaskCategory[])
      if (usersResponse.status === 'fulfilled') setUsers(extractList(usersResponse.value.data) as ErgonUser[])
    } catch {
      toast.error('Failed to load task form options')
    }
  }

  useEffect(() => {
    fetchDropdowns()
  }, [])

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.priority])

  const notifyTaskChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ergon-task-updated'))
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = filters.search.toLowerCase()
      const matchesSearch = !query ||
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assigned_to_name?.toLowerCase().includes(query) ||
        task.project_name?.toLowerCase().includes(query)
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority
      const matchesStatus = filters.status === 'all' || task.status === filters.status
      const matchesAssignee = filters.assignee === 'all' || String(task.assigned_to ?? '') === filters.assignee
      const matchesDepartment = filters.department === 'all' || String(task.department ?? '') === filters.department
      const dueTime = task.due_date ? new Date(task.due_date).getTime() : null
      const matchesDueFrom = !filters.dueFrom || (dueTime !== null && dueTime >= new Date(filters.dueFrom).getTime())
      const matchesDueTo = !filters.dueTo || (dueTime !== null && dueTime <= new Date(`${filters.dueTo}T23:59:59`).getTime())
      const matchesTab = activeTab === 'all' ||
        (activeTab === 'mine' && task.assigned_to === currentUserId) ||
        (activeTab === 'overdue' && isOverdue(task))
      return matchesSearch && matchesPriority && matchesStatus && matchesAssignee && matchesDepartment && matchesDueFrom && matchesDueTo && matchesTab
    })
  }, [activeTab, currentUserId, filters, tasks])

  const metrics = useMemo(() => {
    const total = tasks.length
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length
    const completed = tasks.filter((task) => task.status === 'completed').length
    const highPriority = tasks.filter((task) => task.priority === 'high').length
    const overdue = tasks.filter(isOverdue).length
    const assignedToMe = tasks.filter((task) => task.assigned_to === currentUserId).length
    const ratio = (value: number) => total ? (value / total) * 100 : 0
    return { total, inProgress, completed, highPriority, overdue, assignedToMe, ratio }
  }, [currentUserId, tasks])

  const handleCreate = async (values: FormState) => {
    setSaving(true)
    try {
      await ergonApi.createTask(buildTaskPayload(values, hideProject))
      toast.success('Task created successfully')
      setShowCreate(false)
      await fetchTasks()
      notifyTaskChange()
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to create task'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (values: FormState) => {
    if (!editingTask) return
    setSaving(true)
    try {
      await ergonApi.updateTask(editingTask.id, buildTaskPayload(values, hideProject))
      toast.success('Task updated successfully')
      setEditingTask(null)
      await fetchTasks()
      notifyTaskChange()
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update task'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await ergonApi.patchTask(task.id, { status })
      toast.success(`Status updated to ${statusLabels[status]}`)
      await fetchTasks()
      notifyTaskChange()
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update status'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTask) return
    setDeleting(true)
    try {
      await ergonApi.deleteTask(deleteTask.id)
      toast.success('Task deleted')
      setDeleteTask(null)
      await fetchTasks()
      notifyTaskChange()
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to delete task'))
    } finally {
      setDeleting(false)
    }
  }

  const exportTasks = () => {
    const rows = filteredTasks.map((task) => ({
      id: task.id,
      title: task.title,
      assignee: task.assigned_to_name ?? '',
      priority: task.priority,
      status: statusLabels[task.status],
      due_date: task.due_date ?? '',
      progress: taskProgress(task),
    }))
    const csv = [
      'Task ID,Title,Assignee,Priority,Status,Due Date,Progress',
      ...rows.map((row) => [row.id, row.title, row.assignee, row.priority, row.status, row.due_date, row.progress].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ergon-tasks.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => setFilters(EMPTY_FILTERS)
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value && value !== 'all' && key !== 'search').length + (filters.search ? 1 : 0)
  const formVisible = showCreate || !!editingTask

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Task Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Enterprise workflow control for Ergon tasks, owners, schedules, and progress.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchTasks}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={exportTasks}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => { setEditingTask(null); setShowCreate(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="h-4 w-4" /> Create Task
          </button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <KpiCard title="Total Tasks" value={metrics.total} subtext="All tracked work" progress={100} icon={<List className="h-5 w-5" />} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
        <KpiCard title="In Progress" value={metrics.inProgress} subtext="Active execution" progress={metrics.ratio(metrics.inProgress)} icon={<Clock className="h-5 w-5" />} tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
        <KpiCard title="Completed" value={metrics.completed} subtext="Closed tasks" progress={metrics.ratio(metrics.completed)} icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <KpiCard title="High Priority" value={metrics.highPriority} subtext="Requires attention" progress={metrics.ratio(metrics.highPriority)} icon={<Flag className="h-5 w-5" />} tone="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
        <KpiCard title="Overdue" value={metrics.overdue} subtext="Past due date" progress={metrics.ratio(metrics.overdue)} icon={<AlertCircle className="h-5 w-5" />} tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
        <KpiCard title="Assigned To Me" value={metrics.assignedToMe} subtext="My ownership" progress={metrics.ratio(metrics.assignedToMe)} icon={<User className="h-5 w-5" />} tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-4 border-b border-border flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search task title, description, assignee, project"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select value={filters.priority} onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))} className={inputCls}>
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={inputCls}>
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={filters.assignee} onChange={(event) => setFilters((prev) => ({ ...prev, assignee: event.target.value }))} className={inputCls}>
            <option value="all">All Assignees</option>
            {users.map((item) => <option key={item.id} value={item.id}>{userLabel(item)}</option>)}
          </select>
          <select value={filters.department} onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))} className={inputCls}>
            <option value="all">All Departments</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <input type="date" value={filters.dueFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dueFrom: event.target.value }))} className="bg-transparent text-foreground focus:outline-none" />
              <span>to</span>
              <input type="date" value={filters.dueTo} onChange={(event) => setFilters((prev) => ({ ...prev, dueTo: event.target.value }))} className="bg-transparent text-foreground focus:outline-none" />
            </div>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent">
                <Filter className="h-4 w-4" /> Clear {activeFilterCount}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              {(['all', 'mine', 'overdue'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab === 'mine' ? 'Assigned To Me' : tab}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              <button type="button" onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>Table</button>
              <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>List</button>
            </div>
          </div>
        </div>
      </div>

      {formVisible && (
        <TaskFormPanel
          title={editingTask ? 'Edit Task' : 'Create Task'}
          initialValues={editingTask ? toFormState(editingTask) : EMPTY_FORM}
          projects={projects}
          departments={departments}
          categories={categories}
          tasks={tasks.filter((task) => task.id !== editingTask?.id)}
          users={users}
          loading={saving}
          hideProject={hideProject}
          onClose={() => { setShowCreate(false); setEditingTask(null) }}
          onSubmit={editingTask ? handleEdit : handleCreate}
        />
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Task Register</h2>
            <p className="text-xs text-muted-foreground">{filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} shown</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading tasks
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <CheckSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No tasks found</p>
            <button
              type="button"
              onClick={() => { setEditingTask(null); setShowCreate(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Create Task
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Task ID</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold">Progress</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task)
                  const department = departments.find((item) => item.id === task.department)
                  return (
                    <tr key={task.id} className={`hover:bg-accent/40 transition-colors ${overdue ? 'bg-amber-50/60 dark:bg-amber-950/10' : ''}`}>
                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">#{task.id}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground max-w-[280px] truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground max-w-[320px] truncate">{task.description || task.project_name || '-'}</div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> {task.assigned_to_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{department?.name || '-'}</td>
                      <td className="px-4 py-4"><PriorityPill priority={task.priority} /></td>
                      <td className="px-4 py-4">
                        <select value={task.status} onChange={(event) => handleStatusChange(task, event.target.value as TaskStatus)} className="bg-transparent focus:outline-none">
                          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </td>
                      <td className={`px-4 py-4 ${overdue ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-muted-foreground'}`}>
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-4 py-4"><ProgressBar value={taskProgress(task)} /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => { setShowCreate(false); setEditingTask(task) }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit task">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteTask(task)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/30" title="Delete task">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 rounded-xl border border-border bg-background hover:bg-accent/30 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{task.title}</span>
                      <StatusBadge status={task.status} />
                      <PriorityPill priority={task.priority} />
                      {isOverdue(task) && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Overdue</span>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.description || 'No description'}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {task.assigned_to_name || 'Unassigned'}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(task.due_date)}</span>
                      {task.project_name && <span className="inline-flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" /> {task.project_name}</span>}
                      {task.depends_on_task && <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Depends #{task.depends_on_task}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:min-w-[260px]">
                    <ProgressBar value={taskProgress(task)} />
                    <button type="button" onClick={() => { setShowCreate(false); setEditingTask(task) }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleteTask(task)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteModal
        open={!!deleteTask}
        taskTitle={deleteTask?.title ?? ''}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTask(null)}
      />
    </div>
  )
}
