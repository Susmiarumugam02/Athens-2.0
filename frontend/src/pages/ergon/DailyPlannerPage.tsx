import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Gauge,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'

type TaskStatus = 'not_started' | 'in_progress' | 'on_break' | 'completed' | 'postponed' | 'rolled_over'
type Priority = 'low' | 'medium' | 'high'
type TaskFilter = 'all' | 'mine' | 'high' | 'overdue' | 'rollover' | 'completed'

interface DailyTask {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  progress: number
  scheduled_date: string
  planned_start_time: string | null
  planned_duration: number
  start_time: string | null
  sla_end_time: string | null
  active_seconds: number
  pause_duration: number
  completion_time: string | null
  postponed_from_date: string | null
  postponed_to_date: string | null
  rollover_source_date: string | null
  rollover_timestamp: string | null
  is_rollover?: boolean
  rollover_date?: string | null
  rollover_reason?: string
  original_due_date?: string | null
  sla_time?: number
  actual_time?: number
  execution_notes?: string
  execution_status?: string
  timer_started_at?: string | null
  timer_paused_at?: string | null
  total_paused_duration?: number
  user_name?: string
  department_name?: string
}

const rolloverReasons = [
  'Waiting approval',
  'Dependency blocked',
  'Resource unavailable',
  'Extended work',
  'Reassigned',
  'External delay',
  'Other',
]

const statusLabels: Record<TaskStatus, string> = {
  not_started: 'Pending',
  in_progress: 'In Progress',
  on_break: 'Paused',
  completed: 'Completed',
  postponed: 'Postponed',
  rolled_over: 'Rollover',
}

const statusStyles: Record<TaskStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  on_break: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  postponed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  rolled_over: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

const priorityStyles: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.results)) return record.results as T[]
  }
  return []
}

function unwrapData<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data
  }
  return data as T
}

function fmtSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function dateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function shortDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isRollover(task: DailyTask): boolean {
  return Boolean(task.is_rollover || task.status === 'rolled_over' || task.rollover_source_date || task.postponed_from_date)
}

function isOverdue(task: DailyTask): boolean {
  if (['completed', 'postponed', 'rolled_over'].includes(task.status)) return false
  if (task.sla_end_time) return new Date(task.sla_end_time).getTime() < Date.now()
  return task.scheduled_date < new Date().toISOString().split('T')[0]
}

function activeElapsed(task: DailyTask): number {
  if (task.status !== 'in_progress' || !task.start_time) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(task.start_time).getTime()) / 1000))
}

function slaSeconds(task: DailyTask): number {
  if (task.sla_time && task.sla_time > 0) return task.sla_time
  if (task.sla_end_time && task.start_time) {
    return Math.max(0, Math.floor((new Date(task.sla_end_time).getTime() - new Date(task.start_time).getTime()) / 1000))
  }
  return Math.max(0, (task.planned_duration || 60) * 60)
}

function getApiError(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return fallback
  const payload = data as Record<string, unknown>
  if (typeof payload.detail === 'string') return payload.detail
  if (typeof payload.error === 'string') return payload.error
  if (typeof payload.message === 'string') return payload.message
  return fallback
}

function getTomorrowDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>
}

function KpiCard({ title, value, icon, tone, helper }: {
  title: string
  value: number | string
  icon: ReactNode
  tone: string
  helper: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`p-2.5 rounded-lg w-fit ${tone}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  )
}

function LiveTimer({ task }: { task: DailyTask }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (task.status !== 'in_progress') return
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [task.status])
  const elapsed = (task.actual_time || task.active_seconds || 0) + activeElapsed(task)
  return <span className="font-semibold text-blue-600 dark:text-blue-300">{fmtSeconds(elapsed)}</span>
}

function TimePanel({ task }: { task: DailyTask }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (task.status !== 'in_progress') return
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [task.status])

  const elapsed = (task.actual_time || task.active_seconds || 0) + activeElapsed(task)
  const sla = slaSeconds(task)
  const remaining = Math.max(0, sla - elapsed)
  const utilization = sla > 0 ? Math.min(100, Math.round((elapsed / sla) * 100)) : 0

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Total Time</div>
          <div className="mt-1 font-semibold text-foreground">{fmtSeconds(elapsed)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">SLA Time</div>
          <div className="mt-1 font-semibold text-foreground">{fmtSeconds(sla)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Remaining</div>
          <div className={`mt-1 font-semibold ${remaining === 0 ? 'text-red-600 dark:text-red-300' : 'text-foreground'}`}>{fmtSeconds(remaining)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Active Timer</div>
          <div className="mt-1"><LiveTimer task={task} /></div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">SLA utilization</span>
          <span className="font-medium text-foreground">{utilization}%</span>
        </div>
        <div className="h-2 rounded-full bg-accent overflow-hidden">
          <div className={`h-full rounded-full ${utilization >= 100 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${utilization}%` }} />
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, busy, expanded, onExpand, onStart, onPause, onResume, onComplete, onPostpone, onRollover }: {
  task: DailyTask
  busy: boolean
  expanded: boolean
  onExpand: () => void
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onPostpone: () => void
  onRollover: () => void
}) {
  const overdue = isOverdue(task)
  const slaState = overdue ? 'Breached' : task.status === 'completed' ? 'Met' : 'On Track'
  const canAct = !['completed', 'postponed', 'rolled_over'].includes(task.status)
  const departmentName = task.department_name || 'Unassigned department'

  return (
    <article className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className={`h-1 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      <div className="p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">{task.title}</h3>
              <Badge className={priorityStyles[task.priority]}>{task.priority}</Badge>
              <Badge className={statusStyles[task.status]}>{statusLabels[task.status]}</Badge>
              {overdue && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Overdue</Badge>}
              {isRollover(task) && <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Rollover</Badge>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.description || 'No execution notes added yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Due {task.planned_start_time || shortDate(task.scheduled_date)}</span>
              <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> SLA {slaState}</span>
              <span className="inline-flex items-center gap-1"><Circle className="h-3.5 w-3.5" /> Department: {departmentName}</span>
            </div>
          </div>
          <button type="button" onClick={onExpand} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <History className="h-4 w-4" /> {expanded ? 'Hide Notes' : 'Notes & Logs'}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Execution progress</span>
            <span className="font-semibold text-foreground">{task.progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-accent overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
          </div>
        </div>

        <TimePanel task={task} />

        {canAct && (
          <div className="flex flex-wrap gap-2">
            {task.status === 'not_started' && (
              <button disabled={busy} onClick={onStart} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Play className="h-4 w-4" /> Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <>
                <button disabled={busy} onClick={onPause} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  <Pause className="h-4 w-4" /> Pause
                </button>
                <button disabled={busy} onClick={onComplete} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> Complete
                </button>
              </>
            )}
            {task.status === 'on_break' && (
              <button disabled={busy} onClick={onResume} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Play className="h-4 w-4" /> Resume
              </button>
            )}
            <button disabled={busy} onClick={onPostpone} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-900/20 text-sm font-medium disabled:opacity-50">
              <SkipForward className="h-4 w-4" /> Postpone
            </button>
            <button disabled={busy} onClick={onRollover} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:text-violet-300 dark:bg-violet-900/20 text-sm font-medium disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /> Move to Rollover
            </button>
            <button type="button" onClick={onExpand} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent">
              <FileText className="h-4 w-4" /> Add Notes
            </button>
          </div>
        )}

        {expanded && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Execution Notes</h4>
            <p className="text-sm text-muted-foreground">{task.execution_notes || task.description || 'No notes have been captured for this execution yet.'}</p>
            <div className="mt-4 border-t border-border pt-3 space-y-2">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Circle className="h-3 w-3 mt-0.5 text-primary" />
                <span>Created for {shortDate(task.scheduled_date)}</span>
              </div>
              {task.start_time && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Circle className="h-3 w-3 mt-0.5 text-blue-500" />
                  <span>Started at {new Date(task.start_time).toLocaleTimeString()}</span>
                </div>
              )}
              {task.completion_time && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Circle className="h-3 w-3 mt-0.5 text-emerald-500" />
                  <span>Completed at {new Date(task.completion_time).toLocaleTimeString()}</span>
                </div>
              )}
              {task.rollover_reason && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Circle className="h-3 w-3 mt-0.5 text-violet-500" />
                  <span>Rollover reason: {task.rollover_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function TaskModal({ open, loading, selectedDate, onClose, onSubmit }: {
  open: boolean
  loading: boolean
  selectedDate: string
  onClose: () => void
  onSubmit: (values: { title: string; description: string; priority: Priority; planned_duration: number }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [plannedDuration, setPlannedDuration] = useState(60)

  if (!open) return null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { toast.error('Task title is required'); return }
    onSubmit({ title: title.trim(), description: description.trim(), priority, planned_duration: plannedDuration })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add Daily Task</h2>
            <p className="text-xs text-muted-foreground">Scheduled for {dateLabel(selectedDate)}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-foreground mb-1.5">Task Title *</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-foreground mb-1.5">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-1.5">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-1.5">SLA Minutes</span>
              <input type="number" min={1} value={plannedDuration} onChange={(event) => setPlannedDuration(Number(event.target.value) || 60)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RolloverModal({ open, loading, onClose, onConfirm }: {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (newDate: string, reason: string, priority: Priority) => void
}) {
  const [minimumDate] = useState(getTodayDate)
  const [newDate, setNewDate] = useState(getTomorrowDate)
  const [reason, setReason] = useState(rolloverReasons[0])
  const [priority, setPriority] = useState<Priority>('high')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Move to Rollover</h2>
            <p className="text-sm text-muted-foreground">Carry this task forward with a reason and escalation priority.</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Next Execution Date</span>
          <input type="date" min={minimumDate} value={newDate} onChange={(event) => setNewDate(event.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Rollover Reason</span>
          <select value={reason} onChange={(event) => setReason(event.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            {rolloverReasons.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Escalation Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">Cancel</button>
          <button onClick={() => onConfirm(newDate, reason, priority)} disabled={loading || !newDate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Rollover
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DailyPlannerPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rollingOver, setRollingOver] = useState(false)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [dateTo, setDateTo] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<DailyTask | null>(null)
  const [rolloverTarget, setRolloverTarget] = useState<DailyTask | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)

  const fetchTasks = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const response = await ergonApi.getDailyTasks(date)
      setTasks(extractList<DailyTask>(response.data))
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load daily planner'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks(selectedDate) }, [selectedDate, fetchTasks])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = window.setInterval(() => fetchTasks(selectedDate), 60000)
    return () => window.clearInterval(interval)
  }, [autoRefresh, fetchTasks, selectedDate])

  const patchLocal = (id: number, patch: Partial<DailyTask>) =>
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...patch } : task))

  const runAction = async (task: DailyTask, action: () => Promise<DailyTask>, message: string) => {
    setActionLoading(task.id)
    try {
      const updated = await action()
      patchLocal(task.id, updated)
      toast.success(message)
    } catch (error: unknown) {
      toast.error(getApiError(error, `Failed to ${message.toLowerCase()}`))
    } finally {
      setActionLoading(null)
    }
  }

  const handleStart = (task: DailyTask) => runAction(task, async () => unwrapData<DailyTask>((await ergonApi.startTask(task.id)).data), 'Task started')
  const handlePause = (task: DailyTask) => runAction(task, async () => unwrapData<DailyTask>((await ergonApi.pauseTask(task.id)).data), 'Task paused')
  const handleResume = (task: DailyTask) => runAction(task, async () => unwrapData<DailyTask>((await ergonApi.resumeTask(task.id)).data), 'Task resumed')

  const handleComplete = async (progress = 100) => {
    if (!completeTarget) return
    setActionLoading(completeTarget.id)
    try {
      const response = await ergonApi.completeTask(completeTarget.id, { progress, notes: completeTarget.execution_notes || '' })
      patchLocal(completeTarget.id, unwrapData<DailyTask>(response.data))
      toast.success('Task completed')
      setCompleteTarget(null)
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to complete task'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateTask = async (values: { title: string; description: string; priority: Priority; planned_duration: number }) => {
    setModalLoading(true)
    try {
      const payload = { ...values, scheduled_date: selectedDate, status: 'not_started', progress: 0 }
      const response = await ergonApi.createDailyTask(payload)
      setTasks((prev) => [...prev, unwrapData<DailyTask>(response.data)])
      toast.success('Daily task added')
      setShowTaskModal(false)
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to add task'))
    } finally {
      setModalLoading(false)
    }
  }

  const handleRolloverConfirm = async (newDate: string, reason: string, priority: Priority) => {
    if (!rolloverTarget) return
    setActionLoading(rolloverTarget.id)
    try {
      const response = await ergonApi.postponeTask(rolloverTarget.id, { new_date: newDate, reason, priority, notes: reason })
      patchLocal(rolloverTarget.id, { ...unwrapData<DailyTask>(response.data), rollover_reason: reason, is_rollover: true })
      toast.success('Task moved to rollover')
      setRolloverTarget(null)
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to rollover task'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkRollover = async () => {
    setRollingOver(true)
    try {
      const response = await ergonApi.rolloverTasks()
      const count = (response.data?.data?.rolled_over ?? response.data?.rolled_over ?? 0) as number
      toast.success(`${count} task${count === 1 ? '' : 's'} rolled over to today`)
      await fetchTasks(selectedDate)
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to rollover tasks'))
    } finally {
      setRollingOver(false)
    }
  }

  const metrics = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((task) => task.status === 'completed').length
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length
    const postponed = tasks.filter((task) => task.status === 'postponed').length
    const rollover = tasks.filter(isRollover).length
    const slaBreached = tasks.filter(isOverdue).length
    const activeSeconds = tasks.reduce((sum, task) => sum + (task.actual_time || task.active_seconds || 0), 0)
    const slaTotal = tasks.reduce((sum, task) => sum + slaSeconds(task), 0)
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    const utilization = slaTotal ? Math.min(100, Math.round((activeSeconds / slaTotal) * 100)) : 0
    return { total, completed, inProgress, postponed, rollover, slaBreached, completionRate, utilization }
  }, [tasks])

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'mine') ||
      (filter === 'high' && task.priority === 'high') ||
      (filter === 'overdue' && isOverdue(task)) ||
      (filter === 'rollover' && isRollover(task)) ||
      (filter === 'completed' && task.status === 'completed')
    const matchesDateRange = !dateTo || task.scheduled_date <= dateTo
    return matchesFilter && departmentFilter === 'all' && matchesDateRange
  })

  const rolloverTasks = tasks.filter((task) => isRollover(task) || task.status === 'postponed' || isOverdue(task))
  const activeTasks = filteredTasks.filter((task) => !isRollover(task) || filter === 'rollover')

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Calendar className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Daily Planner</h1>
                <p className="text-sm text-muted-foreground mt-1">{dateLabel(selectedDate)}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Execution Mode</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={() => setAutoRefresh((value) => !value)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${autoRefresh ? 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 'border-border text-foreground hover:bg-accent'}`}>
              <Bell className="h-4 w-4" /> Auto Refresh
            </button>
            <button onClick={() => fetchTasks(selectedDate)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button disabled={rollingOver} onClick={handleBulkRollover} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:text-violet-300 dark:bg-violet-900/20 text-sm font-medium disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /> {rollingOver ? 'Syncing' : 'Sync Tasks'}
            </button>
            <button onClick={() => setShowTaskModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md">
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <main className="space-y-5">
          <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-2">
            {(['all', 'mine', 'high', 'overdue', 'rollover', 'completed'] as TaskFilter[]).map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${filter === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                {item === 'mine' ? 'My Tasks' : item}
              </button>
            ))}
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="ml-auto px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
              <option value="all">All Departments</option>
            </select>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground" />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Task Execution</h2>
                <p className="text-sm text-muted-foreground">Live execution tracking, timers, SLA, notes, and workflow controls.</p>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            {loading ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">Loading planner...</div>
            ) : activeTasks.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No tasks match the current planner filters.
              </div>
            ) : activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={actionLoading === task.id}
                expanded={expandedTaskId === task.id}
                onExpand={() => setExpandedTaskId((id) => id === task.id ? null : task.id)}
                onStart={() => handleStart(task)}
                onPause={() => handlePause(task)}
                onResume={() => handleResume(task)}
                onComplete={() => setCompleteTarget(task)}
                onPostpone={() => setRolloverTarget(task)}
                onRollover={() => setRolloverTarget(task)}
              />
            ))}
          </section>

          <section className="bg-card border border-border rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Today's Rollover Tasks</h2>
                <p className="text-sm text-muted-foreground">Previous pending, postponed, overdue, and manually carried-forward work.</p>
              </div>
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{rolloverTasks.length} tasks</Badge>
            </div>
            {rolloverTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No rollover tasks for this date.</div>
            ) : (
              <div className="space-y-3">
                {rolloverTasks.map((task) => (
                  <div key={`rollover-${task.id}`} className="rounded-lg border border-border bg-background p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{task.title}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Rollover date: {shortDate(task.rollover_date || task.scheduled_date)}</span>
                        <span>Original due: {shortDate(task.original_due_date || task.rollover_source_date || task.postponed_from_date)}</span>
                        <span>Reason: {task.rollover_reason || 'Pending execution'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCompleteTarget(task)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700">Mark Resolved</button>
                      <button onClick={() => setRolloverTarget(task)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent">Reschedule</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard title="Completed" value={metrics.completed} helper="Finished today" icon={<CheckCircle2 className="h-4 w-4" />} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <KpiCard title="In Progress" value={metrics.inProgress} helper="Currently active" icon={<Play className="h-4 w-4" />} tone="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" />
            <KpiCard title="Postponed" value={metrics.postponed} helper="Moved forward" icon={<SkipForward className="h-4 w-4" />} tone="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" />
            <KpiCard title="Total Tasks" value={metrics.total} helper="Scheduled" icon={<Calendar className="h-4 w-4" />} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
            <KpiCard title="Rollover" value={metrics.rollover} helper="Carry-forward" icon={<RotateCcw className="h-4 w-4" />} tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" />
            <KpiCard title="SLA Breached" value={metrics.slaBreached} helper="Needs action" icon={<AlertCircle className="h-4 w-4" />} tone="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Completion Analytics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Completion Rate</span><span className="font-semibold text-foreground">{metrics.completionRate}%</span></div>
                <div className="h-2 rounded-full bg-accent overflow-hidden"><div className="h-full bg-emerald-600 rounded-full" style={{ width: `${metrics.completionRate}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Utilization</span><span className="font-semibold text-foreground">{metrics.utilization}%</span></div>
                <div className="h-2 rounded-full bg-accent overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${metrics.utilization}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">SLA Progress</span><span className="font-semibold text-foreground">{Math.max(0, 100 - metrics.slaBreached * 10)}%</span></div>
                <div className="h-2 rounded-full bg-accent overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(0, 100 - metrics.slaBreached * 10)}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Notifications</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> {metrics.slaBreached} SLA breach alert(s)</div>
              <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-violet-500" /> {metrics.rollover} rollover task(s)</div>
              <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-blue-500" /> {metrics.inProgress} active timer(s)</div>
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-500" /> Escalation required for high overdue tasks</div>
            </div>
          </div>
        </aside>
      </div>

      <TaskModal open={showTaskModal} loading={modalLoading} selectedDate={selectedDate} onClose={() => setShowTaskModal(false)} onSubmit={handleCreateTask} />
      <RolloverModal open={!!rolloverTarget} loading={actionLoading === rolloverTarget?.id} onClose={() => setRolloverTarget(null)} onConfirm={handleRolloverConfirm} />
      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Complete Task</h2>
            <p className="text-sm text-muted-foreground">Mark <span className="font-medium text-foreground">{completeTarget.title}</span> as complete.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent">Cancel</button>
              <button onClick={() => handleComplete(100)} disabled={actionLoading === completeTarget.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {actionLoading === completeTarget.id && <Loader2 className="h-4 w-4 animate-spin" />} Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
