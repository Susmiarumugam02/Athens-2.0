import { useState } from 'react'
import { Calendar, Clock, Play, Pause, CheckCircle, AlertCircle, TrendingUp, TrendingDown, SkipForward } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; isUp: boolean }
  onClick?: () => void
  color?: string
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, trend, onClick, color = 'text-primary' }) => (
  <div
    onClick={onClick}
    className={`bg-card border border-border rounded-xl p-3 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-accent ${color}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
    <div className="text-xs font-medium text-foreground mb-0.5">{title}</div>
    {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
  </div>
)

interface DailyTask {
  id: number
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'on_break' | 'completed'
  priority: 'low' | 'medium' | 'high'
  progress: number
  startTime: string | null
  slaEndTime: string | null
  activeSeconds: number
  pauseDuration: number
  scheduledDate: string
}

export default function DailyPlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const mockTasks: DailyTask[] = [
    {
      id: 1,
      title: 'Morning site inspection',
      description: 'Complete safety inspection of all work areas',
      status: 'completed',
      priority: 'high',
      progress: 100,
      startTime: '08:00',
      slaEndTime: '10:00',
      activeSeconds: 7200,
      pauseDuration: 0,
      scheduledDate: selectedDate
    },
    {
      id: 2,
      title: 'Equipment maintenance',
      description: 'Routine maintenance of installation equipment',
      status: 'in_progress',
      priority: 'high',
      progress: 65,
      startTime: '10:30',
      slaEndTime: '14:00',
      activeSeconds: 5400,
      pauseDuration: 600,
      scheduledDate: selectedDate
    },
    {
      id: 3,
      title: 'Team coordination meeting',
      description: 'Daily standup with project team',
      status: 'not_started',
      priority: 'medium',
      progress: 0,
      startTime: null,
      slaEndTime: '15:00',
      activeSeconds: 0,
      pauseDuration: 0,
      scheduledDate: selectedDate
    },
    {
      id: 4,
      title: 'Documentation update',
      description: 'Update project documentation and reports',
      status: 'on_break',
      priority: 'medium',
      progress: 40,
      startTime: '15:30',
      slaEndTime: '17:00',
      activeSeconds: 1800,
      pauseDuration: 900,
      scheduledDate: selectedDate
    }
  ]

  const metrics = {
    total: mockTasks.length,
    notStarted: mockTasks.filter(t => t.status === 'not_started').length,
    inProgress: mockTasks.filter(t => t.status === 'in_progress').length,
    onBreak: mockTasks.filter(t => t.status === 'on_break').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
    avgProgress: Math.round(mockTasks.reduce((sum, t) => sum + t.progress, 0) / mockTasks.length)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'on_break': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Daily Planner</h1>
          </div>
          <p className="text-muted-foreground">Daily task execution with SLA tracking and time management</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Rollover Tasks
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Total Tasks"
          value={metrics.total}
          subtitle="Scheduled today"
          icon={<Calendar className="h-5 w-5" />}
        />
        <KPICard
          title="Not Started"
          value={metrics.notStarted}
          subtitle="Pending"
          icon={<Clock className="h-5 w-5" />}
          color="text-gray-600"
        />
        <KPICard
          title="In Progress"
          value={metrics.inProgress}
          subtitle="Active now"
          icon={<Play className="h-5 w-5" />}
          color="text-blue-600"
        />
        <KPICard
          title="On Break"
          value={metrics.onBreak}
          subtitle="Paused"
          icon={<Pause className="h-5 w-5" />}
          color="text-yellow-600"
        />
        <KPICard
          title="Completed"
          value={metrics.completed}
          subtitle="Finished"
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-green-600"
        />
        <KPICard
          title="Avg Progress"
          value={`${metrics.avgProgress}%`}
          subtitle="Overall"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600"
        />
      </div>

      {/* Tasks List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Tasks</h3>
        <div className="space-y-4">
          {mockTasks.map((task) => (
            <div key={task.id} className="bg-accent rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-foreground">{task.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                  
                  {/* Progress Bar */}
                  {task.progress > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Time Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Time Used:</span>
                      <span className="ml-2 font-medium text-foreground">{formatTime(task.activeSeconds)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Break Time:</span>
                      <span className="ml-2 font-medium text-foreground">{formatTime(task.pauseDuration)}</span>
                    </div>
                    {task.slaEndTime && (
                      <div>
                        <span className="text-muted-foreground">SLA End:</span>
                        <span className="ml-2 font-medium text-foreground">{task.slaEndTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {task.status === 'not_started' && (
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Start
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2">
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Complete
                    </button>
                  </>
                )}
                {task.status === 'on_break' && (
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                )}
                {task.status !== 'completed' && (
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
                    <SkipForward className="h-4 w-4" />
                    Postpone
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
