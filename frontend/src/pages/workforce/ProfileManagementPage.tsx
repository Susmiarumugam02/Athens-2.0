import { useState } from 'react'
import { Plus, Search, User, Mail, Phone, MapPin, Calendar, TrendingUp, TrendingDown, Briefcase } from 'lucide-react'

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

interface Employee {
  id: number
  name: string
  email: string
  phone: string
  department: string
  designation: string
  joiningDate: string
  status: 'active' | 'inactive' | 'on_leave'
  location: string
}

export default function ProfileManagementPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')

  const mockEmployees: Employee[] = [
    { id: 1, name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 98765 43210', department: 'Engineering', designation: 'Senior Engineer', joiningDate: '2023-01-15', status: 'active', location: 'Mumbai' },
    { id: 2, name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 87654 32109', department: 'HR', designation: 'HR Manager', joiningDate: '2022-06-20', status: 'active', location: 'Delhi' },
    { id: 3, name: 'Amit Patel', email: 'amit@example.com', phone: '+91 76543 21098', department: 'Operations', designation: 'Operations Lead', joiningDate: '2023-03-10', status: 'on_leave', location: 'Pune' }
  ]

  const metrics = {
    total: mockEmployees.length,
    active: mockEmployees.filter(e => e.status === 'active').length,
    onLeave: mockEmployees.filter(e => e.status === 'on_leave').length,
    inactive: mockEmployees.filter(e => e.status === 'inactive').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredEmployees = mockEmployees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus
    const matchesDepartment = filterDepartment === 'all' || e.department === filterDepartment
    return matchesSearch && matchesStatus && matchesDepartment
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Profile Management</h1>
          </div>
          <p className="text-muted-foreground">Manage employee profiles and information</p>
        </div>
        <button onClick={() => setActiveTab('form')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Employees" value={metrics.total} subtitle="All employees" icon={<User className="h-5 w-5" />} />
        <KPICard title="Active" value={metrics.active} subtitle="Working" icon={<Briefcase className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="On Leave" value={metrics.onLeave} subtitle="Currently away" icon={<Calendar className="h-5 w-5" />} color="text-yellow-600" />
        <KPICard title="Inactive" value={metrics.inactive} subtitle="Not working" icon={<User className="h-5 w-5" />} color="text-gray-600" />
      </div>

      {activeTab === 'list' ? (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80">
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{employee.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(employee.status)}`}>{employee.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{employee.designation} • {employee.department}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{employee.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{employee.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined: {employee.joiningDate}</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm">View</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Add New Employee</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Full Name *</label><input type="text" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Email *</label><input type="email" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Phone *</label><input type="tel" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Department *</label><select required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"><option value="">Select Department</option><option value="Engineering">Engineering</option><option value="HR">HR</option><option value="Operations">Operations</option></select></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Designation *</label><input type="text" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Joining Date *</label><input type="date" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Location *</label><input type="text" required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-2">Status *</label><select required className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Add Employee</button>
              <button type="button" onClick={() => setActiveTab('list')} className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
