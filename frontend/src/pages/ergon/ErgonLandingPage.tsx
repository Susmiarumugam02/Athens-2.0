import { useNavigate } from 'react-router-dom'
import { useEnabledModules } from '../../hooks/useEnabledModules'
import { CheckSquare, Calendar, Bell, FileText, Users, Briefcase } from 'lucide-react'

const ERGON_COMPONENTS = [
  { code: 'ergon_tasks', name: 'Task Management', description: 'Create and manage tasks', icon: CheckSquare, href: '/app/ergon/tasks', color: 'from-blue-500 to-cyan-500' },
  { code: 'ergon_planner', name: 'Daily Planner', description: 'Daily task execution with SLA tracking', icon: Calendar, href: '/app/ergon/planner', color: 'from-purple-500 to-pink-500' },
  { code: 'ergon_followups', name: 'Follow-ups', description: 'Track follow-ups and reminders', icon: Bell, href: '/app/ergon/followups', color: 'from-yellow-500 to-orange-500' },
  { code: 'ergon_advance', name: 'Advance/Expenses', description: 'Manage advances and expenses', icon: FileText, href: '/app/ergon/advance', color: 'from-green-500 to-emerald-500' },
  { code: 'ergon_manpower', name: 'Manpower/Machinery', description: 'Resource allocation', icon: Users, href: '/app/ergon/manpower', color: 'from-indigo-500 to-blue-500' },
  { code: 'ergon_ledger', name: 'Financial Ledger', description: 'Financial tracking', icon: Briefcase, href: '/app/ergon/ledger', color: 'from-red-500 to-pink-500' },
]

export default function ErgonLandingPage() {
  const navigate = useNavigate()
  const { enabledModules, loading } = useEnabledModules()

  const availableComponents = ERGON_COMPONENTS.filter(c => enabledModules.includes(c.code))

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
        <h1 className="text-3xl font-bold text-foreground mb-2">ERGON</h1>
        <p className="text-muted-foreground">Operations & Finance Management</p>
      </div>

      {availableComponents.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">No ERGON components enabled for your project</p>
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
