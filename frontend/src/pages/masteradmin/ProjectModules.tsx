import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

const MODULE_CATEGORIES = [
  {
    category: 'ERGON',
    description: 'Operations & Finance Management',
    components: [
      { code: 'ergon_tasks', name: 'Task Management', description: 'Create and manage tasks' },
      { code: 'ergon_planner', name: 'Daily Planner', description: 'Daily task execution with SLA tracking' },
      { code: 'ergon_followups', name: 'Follow-ups', description: 'Track task follow-ups and reminders' },
      { code: 'ergon_advance', name: 'Advance/Expenses', description: 'Manage advances and expenses' },
      { code: 'ergon_manpower', name: 'Manpower/Machinery', description: 'Resource allocation' },
      { code: 'ergon_ledger', name: 'Financial Ledger', description: 'Financial tracking' },
    ]
  },
  {
    category: 'Workforce',
    description: 'HR, Attendance & Leave Management',
    components: [
      { code: 'workforce_profile', name: 'Profile Management', description: 'Employee profiles' },
      { code: 'workforce_attendance', name: 'Attendance', description: 'Track attendance' },
      { code: 'workforce_leave', name: 'Leave Management', description: 'Leave requests and approvals' },
    ]
  },
  {
    category: 'Other Modules',
    description: 'Additional project modules',
    components: [
      { code: 'ptw', name: 'Permit to Work', description: 'Safety permits' },
      { code: 'incident', name: 'Incident Management', description: 'Report and track incidents' },
      { code: 'safety', name: 'Safety Observation', description: 'Safety observations' },
      { code: 'training', name: 'Training', description: 'Employee training' },
    ]
  },
]

export default function ProjectModulesPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModules()
  }, [projectId])

  const loadModules = async () => {
    try {
      const response = await apiClient.get(`/api/control-plane/project-modules/?project_id=${projectId}`)
      const enabledMap: Record<string, boolean> = {}
      response.data.forEach((m: any) => {
        enabledMap[m.module_code] = m.is_enabled
      })
      setModules(enabledMap)
    } catch (error) {
      console.error('Failed to load modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = async (moduleCode: string) => {
    const isEnabled = !modules[moduleCode]
    try {
      await apiClient.post('/api/control-plane/project-modules/toggle/', {
        project_id: projectId,
        module_code: moduleCode,
        is_enabled: isEnabled
      })
      setModules({ ...modules, [moduleCode]: isEnabled })
      toast.success(`${moduleCode.toUpperCase()} ${isEnabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to toggle module')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Modules</h1>
          <p className="text-gray-600">Enable/disable modules for this project</p>
        </div>
        <button
          onClick={() => navigate('/master-admin/projects')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Projects
        </button>
      </div>

      <div className="space-y-6">
        {MODULE_CATEGORIES.map(category => (
          <div key={category.category} className="bg-white rounded-lg shadow">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-bold">{category.category}</h2>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
            <div className="p-6 space-y-4">
              {category.components.map(component => (
                <div key={component.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{component.name}</h3>
                    <p className="text-sm text-gray-600">{component.description}</p>
                  </div>
                  <button
                    onClick={() => toggleModule(component.code)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      modules[component.code] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        modules[component.code] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
