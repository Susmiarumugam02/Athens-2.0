import { useState } from 'react'
import { Clock, Calendar, CheckCircle, XCircle, TrendingUp, TrendingDown, User, MapPin } from 'lucide-react'

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

interface AttendanceRecord {
  id: number
  employeeName: string
  date: string
  checkIn: string
  checkOut: string | null
  status: 'present' | 'absent' | 'half_day' | 'late'
  location: string
  workHours: number
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const mockAttendance: AttendanceRecord[] = [
    { id: 1, employeeName: 'Rajesh Kumar', date: selectedDate, checkIn: '09:00', checkOut: '18:00', status: 'present', location: 'Mumbai Office', workHours: 9 },
    { id: 2, employeeName: 'Priya Sharma', date: selectedDate, checkIn: '09:15', checkOut: '18:15', status: 'late', location: 'Delhi Office', workHours: 9 },
    { id: 3, employeeName: 'Amit Patel', date: selectedDate, checkIn: '09:00', checkOut: '13:00', status: 'half_day', location: 'Pune Office', workHours: 4 },
    { id: 4, employeeName: 'Suresh Reddy', date: selectedDate, checkIn: '', checkOut: null, status: 'absent', location: '', workHours: 0 }
  ]

  const metrics = {
    total: mockAttendance.length,
    present: mockAttendance.filter(a => a.status === 'present').length,
    absent: mockAttendance.filter(a => a.status === 'absent').length,
    late: mockAttendance.filter(a => a.status === 'late').length,
    avgHours: (mockAttendance.reduce((sum, a) => sum + a.workHours, 0) / mockAttendance.filter(a => a.workHours > 0).length).toFixed(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const filteredAttendance = mockAttendance.filter(a => filterStatus === 'all' || a.status === filterStatus)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
          </div>
          <p className="text-muted-foreground">Track employee attendance and work hours</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Mark Attendance</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Total Employees" value={metrics.total} subtitle="Registered" icon={<User className="h-5 w-5" />} />
        <KPICard title="Present" value={metrics.present} subtitle="Today" icon={<CheckCircle className="h-5 w-5" />} color="text-green-600" />
        <KPICard title="Absent" value={metrics.absent} subtitle="Today" icon={<XCircle className="h-5 w-5" />} color="text-red-600" />
        <KPICard title="Late" value={metrics.late} subtitle="Today" icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
        <KPICard title="Avg Hours" value={metrics.avgHours} subtitle="Per employee" icon={<TrendingUp className="h-5 w-5" />} color="text-blue-600" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredAttendance.map((record) => (
            <div key={record.id} className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80">
              <User className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{record.employeeName}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>{record.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{record.date}</span>
                  {record.checkIn && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />In: {record.checkIn}</span>}
                  {record.checkOut && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Out: {record.checkOut}</span>}
                  {record.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{record.location}</span>}
                  {record.workHours > 0 && <span>Hours: {record.workHours}h</span>}
                </div>
              </div>
              <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
