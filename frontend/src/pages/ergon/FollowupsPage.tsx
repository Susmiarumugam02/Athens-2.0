import { useState } from 'react'
import { Plus, Search, Calendar, User, Phone, Mail, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

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

interface Followup {
  id: number
  contactName: string
  contactPhone: string
  contactEmail: string
  company: string
  subject: string
  description: string
  followupDate: string
  status: 'pending' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high'
  assignedTo: string
  createdAt: string
}

export default function FollowupsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState<Partial<Followup>>({
    status: 'pending',
    priority: 'medium'
  })

  const mockFollowups: Followup[] = [
    {
      id: 1,
      contactName: 'Rajesh Kumar',
      contactPhone: '+91 98765 43210',
      contactEmail: 'rajesh@example.com',
      company: 'ABC Industries',
      subject: 'Project Discussion',
      description: 'Follow up on solar panel installation project',
      followupDate: '2025-02-25',
      status: 'pending',
      priority: 'high',
      assignedTo: 'John Doe',
      createdAt: '2025-02-20'
    },
    {
      id: 2,
      contactName: 'Priya Sharma',
      contactPhone: '+91 87654 32109',
      contactEmail: 'priya@example.com',
      company: 'XYZ Corp',
      subject: 'Quotation Follow-up',
      description: 'Check status of submitted quotation',
      followupDate: '2025-02-22',
      status: 'overdue',
      priority: 'high',
      assignedTo: 'Jane Smith',
      createdAt: '2025-02-15'
    },
    {
      id: 3,
      contactName: 'Amit Patel',
      contactPhone: '+91 76543 21098',
      contactEmail: 'amit@example.com',
      company: 'Tech Solutions',
      subject: 'Payment Reminder',
      description: 'Follow up on pending invoice payment',
      followupDate: '2025-02-28',
      status: 'pending',
      priority: 'medium',
      assignedTo: 'John Doe',
      createdAt: '2025-02-18'
    }
  ]

  const metrics = {
    total: mockFollowups.length,
    pending: mockFollowups.filter(f => f.status === 'pending').length,
    overdue: mockFollowups.filter(f => f.status === 'overdue').length,
    completed: mockFollowups.filter(f => f.status === 'completed').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const filteredFollowups = mockFollowups.filter(f => {
    const matchesSearch = f.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveTab('list')
    setFormData({ status: 'pending', priority: 'medium' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Follow-ups Management</h1>
          </div>
          <p className="text-muted-foreground">Track and manage customer follow-ups and reminders</p>
        </div>
        <button
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Follow-up
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Follow-ups"
          value={metrics.total}
          subtitle="All time"
          icon={<Calendar className="h-5 w-5" />}
        />
        <KPICard
          title="Pending"
          value={metrics.pending}
          subtitle="Active"
          icon={<Clock className="h-5 w-5" />}
          color="text-yellow-600"
        />
        <KPICard
          title="Overdue"
          value={metrics.overdue}
          subtitle="Needs attention"
          icon={<AlertCircle className="h-5 w-5" />}
          color="text-red-600"
        />
        <KPICard
          title="Completed"
          value={metrics.completed}
          subtitle="Finished"
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-green-600"
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
                placeholder="Search by contact, company, or subject..."
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
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Follow-ups List */}
          <div className="space-y-3">
            {filteredFollowups.map((followup) => (
              <div
                key={followup.id}
                className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80"
              >
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{followup.contactName}</h3>
                    <span className="text-sm text-muted-foreground">• {followup.company}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(followup.status)}`}>
                      {followup.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(followup.priority)}`}>
                      {followup.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{followup.subject}</p>
                  <p className="text-sm text-muted-foreground mb-2">{followup.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {followup.contactPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {followup.contactEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Follow-up: {followup.followupDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {followup.assignedTo}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm">
                    Edit
                  </button>
                  <button className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Create New Follow-up</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName || ''}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company *</label>
                <input
                  type="text"
                  required
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Follow-up Date *</label>
                <input
                  type="date"
                  required
                  value={formData.followupDate || ''}
                  onChange={(e) => setFormData({ ...formData, followupDate: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Follow-up
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
