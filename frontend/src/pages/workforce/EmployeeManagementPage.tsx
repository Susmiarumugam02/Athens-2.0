import { useState } from 'react'
import { Plus, Search, Users, Briefcase, TrendingUp, TrendingDown, Building, Award } from 'lucide-react'

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

export default function EmployeeManagementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const mockEmployees = [
    { id: 1, name: 'Rajesh Kumar', empId: 'EMP001', department: 'Engineering', designation: 'Senior Engineer', type: 'Permanent', salary: 75000, joiningDate: '2023-01-15' },
    { id: 2, name: 'Priya Sharma', empId: 'EMP002', department: 'HR', designation: 'HR Manager', type: 'Permanent', salary: 65000, joiningDate: '2022-06-20' },
    { id: 3, name: 'Amit Patel', empId: 'EMP003', department: 'Operations', designation: 'Operations Lead', type: 'Contract', salary: 55000, joiningDate: '2023-03-10' }
  ]

  const metrics = {
    total: mockEmployees.length,
    permanent: mockEmployees.filter(e => e.type === 'Permanent').length,
    contract: mockEmployees.filter(e => e.type === 'Contract').length,
    departments: new Set(mockEmployees.map(e => e.department)).size,
    avgSalary: Math.round(mockEmployees.reduce((sum, e) => sum + e.salary, 0) / mockEmployees.length)
  }

  const filteredEmployees = mockEmployees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.empId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = filterDepartment === 'all' || e.department === filterDepartment
    const matchesType = filterType === 'all' || e.type === filterType
    return matchesSearch && matchesDepartment && matchesType
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          </div>
          <p className="text-muted-foreground">Comprehensive employee data and management</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Total Employees" value={metrics.total} subtitle="All employees" icon={<Users className="h-5 w-5" />} />
        <KPICard title="Permanent" value={metrics.permanent} subtitle="Full-time" icon={<Briefcase className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="Contract" value={metrics.contract} subtitle="Temporary" icon={<Award className="h-5 w-5" />} color="text-blue-600" />
        <KPICard title="Departments" value={metrics.departments} subtitle="Active" icon={<Building className="h-5 w-5" />} color="text-purple-600" />
        <KPICard title="Avg Salary" value={`₹${(metrics.avgSalary / 1000).toFixed(0)}K`} subtitle="Per month" icon={<TrendingUp className="h-5 w-5" />} color="text-green-600" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 flex-wrap mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
            <option value="Operations">Operations</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Emp ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Salary</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Joining Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{employee.empId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{employee.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{employee.department}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{employee.designation}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${employee.type === 'Permanent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{employee.type}</span></td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">₹{employee.salary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{employee.joiningDate}</td>
                  <td className="px-4 py-3 text-center"><button className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
