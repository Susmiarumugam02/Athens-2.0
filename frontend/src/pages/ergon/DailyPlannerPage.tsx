import { useCallback, useEffect, useState } from 'react'
import {
  Calendar, CheckCircle, Clock, Pause, Play, SkipForward, Trash2, TrendingUp, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ergonApi } from '../../services/ergonApi'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'not_started' | 'in_progress' | 'on_break' | 'completed' | 'postponed' | 'rolled_over'
type Priority   = 'low' | 'medium' | 'high'

interface DailyTask {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  progress: number
  scheduled_date: string
  start_time: string | null
  sla_end_time: string | null
  active_seconds: number
  pause_duration: number
  completion_time: string | null
  postponed_to_date: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function statusColor(status: TaskStatus): string {
  switch (status) {
    case 'completed':   return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'on_break':    return 'bg-yellow-100 text-yellow-800'
    case 'postponed':   return 'bg-orange-100 text-orange-800'
    case 'rolled_over': return 'bg-purple-100 text-purple-800'
    default:            return 'bg-gray-100 text-gray-800'
  }
}

function priorityColor(p: Priority): string {
  switch (p) {
    case 'high':   return 'bg-red-100 text-red-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    default:       return 'bg-green-100 text-green-800'
  }
}

function statusLabel(s: TaskStatus): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function extractList(data: unknown): DailyTask[] {
  if (Array.isArray(data)) return data as DailyTask[]
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.data)) return d.data as DailyTask[]
    if (Array.isArray(d.results)) return d.results as DailyTask[]
  }
  return []
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPICard: React.FC<{
  title: string; value: number | string; subtitle?: string
  icon: React.ReactNode; color?: string
}> = ({ title, value, subtitle, icon, color = 'text-primary' }) => (
  <div className="bg-card border border-border rounded-xl p-3">
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-accent ${color}`}>{icon}</div>
    </div>
    <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
    <div className="text-xs font-medium text-foreground mb-0.5">{title}</div>
    {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
  </div>
)

// ─── Postpone Modal ───────────────────────────────────────────────────────────

const PostponeModal: React.FC<{
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (newDate: string, reason: string) => void
}> = ({ open, loading, onClose, onConfirm }) => {
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => { if (open) { setNewDate(''); setReason('') } }, [open])

  if (!open) return null
  const cls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Postpone Task</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">New Date *</label>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why is this being postponed?" className={cls} />
        </div>
        <div className="flex gap-3">
          <button
            disabled={!newDate || loading}
            onClick={() => onConfirm(newDate, reason)}
            className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Postponing…' : 'Postpone'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Complete Modal (progress input) ─────────────────────────────────────────

const CompleteModal: React.FC<{
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (progress: number) => void
}> = ({ open, loading, onClose, onConfirm }) => {
  const [progress, setProgress] = useState(100)

  useEffect(() => { if (open) setProgress(100) }, [open])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Complete Task</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Final Progress: {progress}%
          </label>
          <input type="range" min={1} max={100} value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-full accent-primary" />
        </div>
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={() => onConfirm(progress)}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Completing…' : 'Mark Complete'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Live Timer ───────────────────────────────────────────────────────────────
// Ticks every second for in_progress tasks, showing elapsed time since start_time

const LiveTimer: React.FC<{ task: DailyTask }> = ({ task }) => {
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    if (task.status !== 'in_progress' || !task.start_time) { setExtra(0); return }
    const base = Math.floor((Date.now() - new Date(task.start_time).getTime()) / 1000)
    setExtra(Math.max(0, base))
    const id = setInterval(() => setExtra(p => p + 1), 1000)
    return () => clearInterval(id)
  }, [task.status, task.start_time])

  const total = task.active_seconds + (task.status === 'in_progress' ? extra : 0)
  return (
    <span className={`font-medium ${task.status === 'in_progress' ? 'text-blue-600' : 'text-foreground'}`}>
      {fmtSeconds(total)}
    </span>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

const TaskCard: React.FC<{
  task: DailyTask
  actionLoading: number | null
  onStart:    (t: DailyTask) => void
  onPause:    (t: DailyTask) => void
  onResume:   (t: DailyTask) => void
  onComplete: (t: DailyTask) => void
  onPostpone: (t: DailyTask) => void
  onDelete:   (t: DailyTask) => void
}> = ({ task, actionLoading, onStart, onPause, onResume, onComplete, onPostpone, onDelete }) => {
  const busy = actionLoading === task.id

  const btnBase = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

  return (
    <div className={`bg-accent rounded-xl p-4 border-l-4 ${
      task.status === 'completed'   ? 'border-l-green-500' :
      task.status === 'in_progress' ? 'border-l-blue-500'  :
      task.status === 'on_break'    ? 'border-l-yellow-500':
      task.status === 'postponed'   ? 'border-l-orange-500':
      'border-l-gray-300'
    }`}>
      {/* Title row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm truncate">{task.title}</h4>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(task.status)}`}>
            {statusLabel(task.status)}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
        <button
          onClick={() => onDelete(task)}
          disabled={busy || task.status === 'in_progress'}
          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 ml-2 shrink-0"
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress bar — always visible */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{task.progress}%</span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              task.status === 'completed' ? 'bg-green-500' :
              task.status === 'in_progress' ? 'bg-blue-500' : 'bg-primary'
            }`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Time stats */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <span className="text-muted-foreground block">Time Used</span>
          <LiveTimer task={task} />
        </div>
        <div>
          <span className="text-muted-foreground block">Break Time</span>
          <span className="font-medium text-foreground">{fmtSeconds(task.pause_duration)}</span>
        </div>
        {task.sla_end_time && (
          <div>
            <span className="text-muted-foreground block">SLA End</span>
            <span className="font-medium text-foreground">
              {new Date(task.sla_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {task.status !== 'completed' && task.status !== 'postponed' && task.status !== 'rolled_over' && (
        <div className="flex gap-2 flex-wrap">
          {task.status === 'not_started' && (
            <button
              disabled={busy}
              onClick={() => onStart(task)}
              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <Play className="h-3.5 w-3.5" />
              {busy ? 'Starting…' : 'Start'}
            </button>
          )}

          {task.status === 'in_progress' && (
            <>
              <button
                disabled={busy}
                onClick={() => onPause(task)}
                className={`${btnBase} bg-yellow-600 text-white hover:bg-yellow-700`}
              >
                <Pause className="h-3.5 w-3.5" />
                {busy ? 'Pausing…' : 'Pause'}
              </button>
              <button
                disabled={busy}
                onClick={() => onComplete(task)}
                className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {busy ? 'Completing…' : 'Complete'}
              </button>
            </>
          )}

          {task.status === 'on_break' && (
            <button
              disabled={busy}
              onClick={() => onResume(task)}
              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <Play className="h-3.5 w-3.5" />
              {busy ? 'Resuming…' : 'Resume'}
            </button>
          )}

          <button
            disabled={busy}
            onClick={() => onPostpone(task)}
            className={`${btnBase} bg-orange-600 text-white hover:bg-orange-700`}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Postpone
          </button>
        </div>
      )}

      {task.status === 'completed' && (
        <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
          <CheckCircle className="h-4 w-4" />
          Completed
          {task.completion_time && (
            <span className="text-muted-foreground font-normal">
              at {new Date(task.completion_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {task.status === 'postponed' && task.postponed_to_date && (
        <div className="text-xs text-orange-600 font-medium">
          Postponed to {new Date(task.postponed_to_date).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailyPlannerPage() {
  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [tasks, setTasks]               = useState<DailyTask[]>([])
  const [loading, setLoading]           = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rollingOver, setRollingOver]   = useState(false)

  // Postpone modal state
  const [postponeTask, setPostponeTask]     = useState<DailyTask | null>(null)
  const [postponeLoading, setPostponeLoading] = useState(false)

  // Complete modal state
  const [completeTask, setCompleteTask]     = useState<DailyTask | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)

  // ── Fetch tasks ─────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await ergonApi.getDailyTasks(date)
      setTasks(extractList(res.data))
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks(selectedDate) }, [selectedDate, fetchTasks])

  useEffect(() => {
    const handleExternalUpdate = () => fetchTasks(selectedDate)
    if (typeof window !== 'undefined') {
      window.addEventListener('ergon-task-updated', handleExternalUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ergon-task-updated', handleExternalUpdate)
      }
    }
  }, [selectedDate, fetchTasks])

  // ── Patch a single task in local state (optimistic) ─────────────────────────

  const patchLocal = (id: number, patch: Partial<DailyTask>) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleStart = async (task: DailyTask) => {
    console.log('[DailyPlanner] START clicked task_id=', task.id, 'status=', task.status)
    setActionLoading(task.id)
    try {
      const res = await ergonApi.startTask(task.id)
      const updated = res.data?.data ?? res.data
      patchLocal(task.id, updated)
      toast.success('Task started')
    } catch (err: any) {
      console.error('[DailyPlanner] START error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to start task')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async (task: DailyTask) => {
    console.log('[DailyPlanner] PAUSE clicked task_id=', task.id)
    setActionLoading(task.id)
    try {
      const res = await ergonApi.pauseTask(task.id)
      const updated = res.data?.data ?? res.data
      patchLocal(task.id, updated)
      toast.success('Task paused')
    } catch (err: any) {
      console.error('[DailyPlanner] PAUSE error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to pause task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (task: DailyTask) => {
    console.log('[DailyPlanner] RESUME clicked task_id=', task.id)
    setActionLoading(task.id)
    try {
      const res = await ergonApi.resumeTask(task.id)
      const updated = res.data?.data ?? res.data
      patchLocal(task.id, updated)
      toast.success('Task resumed')
    } catch (err: any) {
      console.error('[DailyPlanner] RESUME error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to resume task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteConfirm = async (progress: number) => {
    if (!completeTask) return
    console.log('[DailyPlanner] COMPLETE task_id=', completeTask.id, 'progress=', progress)
    setCompleteLoading(true)
    try {
      const res = await ergonApi.completeTask(completeTask.id, { progress })
      const updated = res.data?.data ?? res.data
      patchLocal(completeTask.id, updated)
      toast.success('Task completed')
      setCompleteTask(null)
    } catch (err: any) {
      console.error('[DailyPlanner] COMPLETE error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to complete task')
    } finally {
      setCompleteLoading(false)
    }
  }

  const handlePostponeConfirm = async (newDate: string, reason: string) => {
    if (!postponeTask) return
    console.log('[DailyPlanner] POSTPONE task_id=', postponeTask.id, 'to=', newDate)
    setPostponeLoading(true)
    try {
      const res = await ergonApi.postponeTask(postponeTask.id, { new_date: newDate, reason })
      const updated = res.data?.data ?? res.data
      patchLocal(postponeTask.id, updated)
      toast.success(`Task postponed to ${new Date(newDate).toLocaleDateString()}`)
      setPostponeTask(null)
    } catch (err: any) {
      console.error('[DailyPlanner] POSTPONE error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to postpone task')
    } finally {
      setPostponeLoading(false)
    }
  }

  const handleDelete = async (task: DailyTask) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    console.log('[DailyPlanner] DELETE task_id=', task.id)
    setActionLoading(task.id)
    try {
      await ergonApi.deleteDailyTask(task.id)
      setTasks(prev => prev.filter(t => t.id !== task.id))
      toast.success('Task deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete task')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRollover = async () => {
    console.log('[DailyPlanner] ROLLOVER triggered')
    setRollingOver(true)
    try {
      const res = await ergonApi.rolloverTasks()
      const count = res.data?.data?.rolled_over ?? res.data?.rolled_over ?? 0
      toast.success(`${count} task${count !== 1 ? 's' : ''} rolled over to today`)
      if (selectedDate === today) fetchTasks(today)
    } catch (err: any) {
      console.error('[DailyPlanner] ROLLOVER error', err?.response?.data)
      toast.error(err?.response?.data?.detail || 'Failed to rollover tasks')
    } finally {
      setRollingOver(false)
    }
  }

  // ── Metrics (derived from live state) ──────────────────────────────────────

  const metrics = {
    total:      tasks.length,
    notStarted: tasks.filter(t => t.status === 'not_started').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    onBreak:    tasks.filter(t => t.status === 'on_break').length,
    completed:  tasks.filter(t => t.status === 'completed').length,
    avgProgress: tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
      : 0,
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Daily Planner</h1>
          </div>
          <p className="text-muted-foreground">Task execution with SLA tracking and time management</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            disabled={rollingOver}
            onClick={handleRollover}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <SkipForward className="h-4 w-4" />
            {rollingOver ? 'Rolling over…' : 'Rollover Tasks'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Tasks"  value={metrics.total}      subtitle="Scheduled" icon={<Calendar className="h-5 w-5" />} />
        <KPICard title="Not Started"  value={metrics.notStarted} subtitle="Pending"   icon={<Clock className="h-5 w-5" />}    color="text-gray-600" />
        <KPICard title="In Progress"  value={metrics.inProgress} subtitle="Active"    icon={<Play className="h-5 w-5" />}     color="text-blue-600" />
        <KPICard title="On Break"     value={metrics.onBreak}    subtitle="Paused"    icon={<Pause className="h-5 w-5" />}    color="text-yellow-600" />
        <KPICard title="Completed"    value={metrics.completed}  subtitle="Finished"  icon={<CheckCircle className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="Avg Progress" value={`${metrics.avgProgress}%`} subtitle="Overall" icon={<TrendingUp className="h-5 w-5" />} color="text-green-600" />
      </div>

      {/* Task List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-30" />
            <p className="text-sm">No tasks scheduled for this date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                actionLoading={actionLoading}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onComplete={t => setCompleteTask(t)}
                onPostpone={t => setPostponeTask(t)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <PostponeModal
        open={!!postponeTask}
        loading={postponeLoading}
        onClose={() => setPostponeTask(null)}
        onConfirm={handlePostponeConfirm}
      />
      <CompleteModal
        open={!!completeTask}
        loading={completeLoading}
        onClose={() => setCompleteTask(null)}
        onConfirm={handleCompleteConfirm}
      />
    </div>
  )
}
