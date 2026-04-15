import { useState } from 'react'
import { Plus, Search, Calendar, Clock, CheckCircle, XCircle, TrendingUp, TrendingDown, User } from 'lucide-react'

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
  <div onClick={onClick} className={`bg-card border border-border rounded-xl p-3 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-accent ${color}`}>{icon}</div>
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

interface LeaveRequest {
  id: number
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: string
  approvedBy?: string
}

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({ status: 'pending' })

  const mockLeaves: LeaveRequest[] = [
    { id: 1, employeeName: 'Rajesh Kumar', leaveType: 'Sick Leave', startDate: '2025-02-26', endDate: '2025-02-27', days: 2, reason: 'Medical checkup', status: 'pending', appliedDate: '2025-02-24' },
    { id: 2, employeeName: 'Priya Sharma', leaveType: 'Casual Leave', startDate: '2025-03-01', endDate: '2025-03-03', days: 3, reason: 'Personal work', status: 'approved', appliedDate: '2025-02-20', approvedBy: 'John Doe' },
    { id: 3, employeeName: 'Amit Patel', leaveType: 'Annual Leave', startDate: '2025-03-10', endDate: '2025-03-15', days: 6, reason: 'Family vacation', status: 'pending', appliedDate: '2025-02-22' }
  ]

  const metrics = {
    total: mockLeaves.length,
    pending: mockLeaves.filter(l => l.status === 'pending').length,
    approved: mockLeaves.filter(l => l.status === 'approved').length,
    rejected: mockLeaves.filter(l => l.status === 'rejected').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredLeaves = mockLeaves.filter(l => {
    const matchesSearch = l.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || l.reason.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating leave request:', formData)
    setActiveTab('list')
    setFormData({ status: 'pending' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
          </div>
          <p className="text-muted-foreground">Manage employee leave requests and approvals</p>
        </div>
        <button onClick={() => setActiveTab('form')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Requests" value={metrics.total} subtitle="All time" icon={<Calendar className="h-5 w-5" />} />
        <KPICard title="Pending" value={metrics.pending} subtitle="Awaiting approval" icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
        <KPICard title="Approved" value={metrics.approved} subtitle="Granted" icon={<CheckCircle className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="Rejected" value={metrics.rejected} subtitle="Denied" icon={<XCircle className="h-5 w-5" />} color="text-red-600" />
      </div>

      {activeTab === 'list' ? (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Search leave requests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80">
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{leave.employeeName}</h3>
                    <span className="text-sm text-muted-foreground">• {leave.leaveType}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(leave.status)}`}>{leave.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{leave.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{leave.startDate} to {leave.endDate}</span>
                    <span>{leave.days} days</span>
                    <span>Applied: {leave.appliedDate}</span>
                    {leave.approvedBy && <span>Approved by: {leave.approvedBy}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {leave.status === 'pending' && (
                    <>
                      <button className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Approve</button>
                      <button className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Apply for Leave</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Leave Type *</label><select required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"><option value="">Select Type</option><option value="Sick Leave">Sick Leave</option><option value="Casual Leave">Casual Leave</option><option value="Annual Leave">Annual Leave</option></select></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Employee *</label><input type="text" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Start Date *</label><input type="date" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">End Date *</label><input type="date" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-foreground mb-2">Reason *</label><textarea required rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Submit Request</button>
              <button type="button" onClick={() => setActiveTab('list')} className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
