import { useNavigate } from 'react-router-dom'
import { useEnabledModules } from '../../hooks/useEnabledModules'
import { UserCheck, Calendar, ClipboardList } from 'lucide-react'

const WORKFORCE_COMPONENTS = [
  { code: 'workforce_profile', name: 'Profile Management', description: 'Employee profiles and information', icon: UserCheck, href: '/app/workforce/profiles', color: 'from-blue-500 to-cyan-500' },
  { code: 'workforce_attendance', name: 'Attendance', description: 'Track employee attendance', icon: Calendar, href: '/app/workforce/attendance', color: 'from-green-500 to-emerald-500' },
  { code: 'workforce_leave', name: 'Leave Management', description: 'Leave requests and approvals', icon: ClipboardList, href: '/app/workforce/leave', color: 'from-purple-500 to-pink-500' },
]

export default function WorkforceLandingPage() {
  const navigate = useNavigate()
  const { enabledModules, loading } = useEnabledModules()

  const availableComponents = WORKFORCE_COMPONENTS.filter(c => enabledModules.includes(c.code))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Workforce</h1>
        <p className="text-muted-foreground">HR, Attendance & Leave Management</p>
      </div>

      {availableComponents.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">No Workforce components enabled for your project</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableComponents.map((component) => {
            const Icon = component.icon
            return (
              <button
                key={component.code}
                onClick={() => navigate(component.href)}
                className="group bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${component.color} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {component.name}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {component.description}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
