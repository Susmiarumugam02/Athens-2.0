import { useState } from 'react'
import { DollarSign, Search, TrendingUp, TrendingDown, Calendar, CheckCircle, Clock, Download } from 'lucide-react'

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

interface PayrollEntry {
  id: number
  employeeName: string
  empId: string
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  month: string
  status: 'pending' | 'processed' | 'paid'
  paymentDate?: string
}

export default function PayrollWagesPage() {
  const [selectedMonth, setSelectedMonth] = useState('2025-02')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const mockPayroll: PayrollEntry[] = [
    { id: 1, employeeName: 'Rajesh Kumar', empId: 'EMP001', basicSalary: 60000, allowances: 15000, deductions: 5000, netSalary: 70000, month: selectedMonth, status: 'paid', paymentDate: '2025-02-28' },
    { id: 2, employeeName: 'Priya Sharma', empId: 'EMP002', basicSalary: 50000, allowances: 15000, deductions: 4000, netSalary: 61000, month: selectedMonth, status: 'processed' },
    { id: 3, employeeName: 'Amit Patel', empId: 'EMP003', basicSalary: 45000, allowances: 10000, deductions: 3500, netSalary: 51500, month: selectedMonth, status: 'pending' }
  ]

  const metrics = {
    totalPayroll: mockPayroll.reduce((sum, p) => sum + p.netSalary, 0),
    processed: mockPayroll.filter(p => p.status === 'processed' || p.status === 'paid').length,
    pending: mockPayroll.filter(p => p.status === 'pending').length,
    paid: mockPayroll.filter(p => p.status === 'paid').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'processed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredPayroll = mockPayroll.filter(p => {
    const matchesSearch = p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || p.empId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Payroll & Wages</h1>
          </div>
          <p className="text-muted-foreground">Manage employee salaries and wage processing</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Payroll" value={`₹${(metrics.totalPayroll / 100000).toFixed(1)}L`} subtitle="This month" icon={<DollarSign className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="Processed" value={metrics.processed} subtitle="Ready to pay" icon={<CheckCircle className="h-5 w-5" />} color="text-blue-600" />
        <KPICard title="Pending" value={metrics.pending} subtitle="To process" icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
        <KPICard title="Paid" value={metrics.paid} subtitle="Completed" icon={<CheckCircle className="h-5 w-5" />} color="text-green-600" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 flex-wrap mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Emp ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Basic</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Allowances</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Deductions</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Net Salary</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayroll.map((entry) => (
                <tr key={entry.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{entry.empId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{entry.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">₹{entry.basicSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">+₹{entry.allowances.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">-₹{entry.deductions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-foreground">₹{entry.netSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(entry.status)}`}>{entry.status}</span>
                    {entry.paymentDate && <div className="text-xs text-muted-foreground mt-1">{entry.paymentDate}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.status === 'pending' && <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">Process</button>}
                    {entry.status === 'processed' && <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs">Pay</button>}
                    {entry.status === 'paid' && <button className="px-3 py-1 bg-accent text-foreground rounded hover:bg-accent/80 text-xs">Slip</button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-accent border-t-2 border-primary">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-foreground">Total:</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-lg text-foreground">₹{metrics.totalPayroll.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
