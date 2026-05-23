import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../lib/api'
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle2, 
  AlertCircle, Users, Calendar, Activity,
  ArrowRight, BarChart3, ListTodo, UserCheck
} from 'lucide-react'

interface DashboardStats {
  tasks: {
    total: number
    completed: number
    pending: number
    overdue: number
  }
  attendance: {
    present: number
    absent: number
    onLeave: number
    rate: number
  }
  projects: {
    active: number
    completed: number
  }
}

interface RecentActivity {
  id: number
  type: string
  title: string
  time: string
  user: string
}

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        tasks: { total: 45, completed: 32, pending: 10, overdue: 3 },
        attendance: { present: 85, absent: 5, onLeave: 10, rate: 94.4 },
        projects: { active: 3, completed: 12 }
      })
      
      setActivities([
        { id: 1, type: 'task', title: 'Task completed: Safety inspection', time: '2 hours ago', user: 'John Doe' },
        { id: 2, type: 'attendance', title: 'Attendance marked', time: '3 hours ago', user: 'Jane Smith' },
        { id: 3, type: 'leave', title: 'Leave request approved', time: '5 hours ago', user: 'Mike Johnson' },
      ])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: any) => (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {getGreeting()}, {user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your projects today
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={stats?.tasks.total || 0}
          subtitle={`${stats?.tasks.completed || 0} completed`}
          icon={ListTodo}
          color="from-blue-500 to-cyan-500"
          trend={12}
        />
        <StatCard
          title="Pending Tasks"
          value={stats?.tasks.pending || 0}
          subtitle={`${stats?.tasks.overdue || 0} overdue`}
          icon={Clock}
          color="from-yellow-500 to-orange-500"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.attendance.rate || 0}%`}
          subtitle={`${stats?.attendance.present || 0} present today`}
          icon={UserCheck}
          color="from-green-500 to-emerald-500"
          trend={5}
        />
        <StatCard
          title="Active Projects"
          value={stats?.projects.active || 0}
          subtitle={`${stats?.projects.completed || 0} completed`}
          icon={BarChart3}
          color="from-purple-500 to-indigo-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Recent Activities</h2>
            </div>
            <button className="text-sm text-primary hover:underline" onClick={() => navigate('/app/ergon/tasks')}>View All</button>
          </div>
          
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activities</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/app/ergon/tasks')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">View Tasks</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            
            <button
              onClick={() => navigate('/app/ergon/planner')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Daily Planner</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            
            <button
              onClick={() => navigate('/app/workforce/attendance')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Attendance</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Overview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Task Overview</h2>
          <button 
            onClick={() => navigate('/app/ergon/tasks')}
            className="text-sm text-primary hover:underline"
          >
            View All Tasks
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.tasks.completed || 0}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats?.tasks.pending || 0}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-foreground">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats?.tasks.overdue || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
