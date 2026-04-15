import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, CheckSquare, Clock, AlertCircle, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react'

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

interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assignedTo: string
  dueDate: string
  project: string
}

export default function TaskManagementPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [formData, setFormData] = useState<Partial<Task>>({
    status: 'todo',
    priority: 'medium'
  })

  const mockTasks: Task[] = [
    {
      id: 1,
      title: 'Install solar panels - Block A',
      description: 'Complete installation of 50 solar panels on rooftop',
      status: 'in_progress',
      priority: 'high',
      assignedTo: 'John Doe',
      dueDate: '2025-02-28',
      project: 'Solar Installation - ABC Corp'
    },
    {
      id: 2,
      title: 'Electrical wiring inspection',
      description: 'Inspect all electrical connections and wiring',
      status: 'todo',
      priority: 'high',
      assignedTo: 'Jane Smith',
      dueDate: '2025-02-26',
      project: 'Solar Installation - ABC Corp'
    },
    {
      id: 3,
      title: 'Equipment maintenance',
      description: 'Routine maintenance of installation equipment',
      status: 'completed',
      priority: 'medium',
      assignedTo: 'Mike Johnson',
      dueDate: '2025-02-24',
      project: 'Wind Farm - XYZ Ltd'
    },
    {
      id: 4,
      title: 'Safety training session',
      description: 'Conduct safety training for new team members',
      status: 'todo',
      priority: 'medium',
      assignedTo: 'Sarah Williams',
      dueDate: '2025-03-01',
      project: 'Solar Installation - ABC Corp'
    }
  ]

  const metrics = {
    total: mockTasks.length,
    todo: mockTasks.filter(t => t.status === 'todo').length,
    inProgress: mockTasks.filter(t => t.status === 'in_progress').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
    highPriority: mockTasks.filter(t => t.priority === 'high').length,
    overdue: mockTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
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

  const filteredTasks = mockTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating task:', formData)
    setActiveTab('list')
    setFormData({ status: 'todo', priority: 'medium' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
          </div>
          <p className="text-muted-foreground">Create, assign, and track tasks across projects</p>
        </div>
        <button
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Total Tasks"
          value={metrics.total}
          subtitle="All tasks"
          icon={<CheckSquare className="h-5 w-5" />}
        />
        <KPICard
          title="To Do"
          value={metrics.todo}
          subtitle="Not started"
          icon={<Clock className="h-5 w-5" />}
          color="text-gray-600"
        />
        <KPICard
          title="In Progress"
          value={metrics.inProgress}
          subtitle="Active tasks"
          icon={<Clock className="h-5 w-5" />}
          color="text-blue-600"
        />
        <KPICard
          title="Completed"
          value={metrics.completed}
          subtitle="Finished"
          icon={<CheckSquare className="h-5 w-5" />}
          color="text-green-600"
        />
        <KPICard
          title="High Priority"
          value={metrics.highPriority}
          subtitle="Urgent tasks"
          icon={<AlertCircle className="h-5 w-5" />}
          color="text-red-600"
        />
        <KPICard
          title="Overdue"
          value={metrics.overdue}
          subtitle="Past due date"
          icon={<AlertCircle className="h-5 w-5" />}
          color="text-orange-600"
        />
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <div className="bg-card border border-border rounded-xl p-6">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80 cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignedTo}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {task.dueDate}
                    </span>
                    <span>{task.project}</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Create New Task</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
                <select
                  required
                  value={formData.status || 'todo'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Priority *</label>
                <select
                  required
                  value={formData.priority || 'medium'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Assigned To *</label>
                <input
                  type="text"
                  required
                  value={formData.assignedTo || ''}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Project *</label>
                <select
                  required
                  value={formData.project || ''}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Project</option>
                  <option value="Solar Installation - ABC Corp">Solar Installation - ABC Corp</option>
                  <option value="Wind Farm - XYZ Ltd">Wind Farm - XYZ Ltd</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
