import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import { masterAdminService } from '../../services/masteradmin'
import toast from 'react-hot-toast'

const MODULE_CATEGORIES = [
  {
    category: 'ERGON',
    color: 'blue',
    description: 'Operations & Finance Management',
    components: [
      { code: 'ergon_tasks',     name: 'Task Management',     description: 'Create and manage tasks' },
      { code: 'ergon_planner',   name: 'Daily Planner',       description: 'Daily task execution with SLA tracking' },
      { code: 'ergon_followups', name: 'Follow-ups',          description: 'Track task follow-ups and reminders' },
      { code: 'ergon_advance',   name: 'Advance / Expenses',  description: 'Manage advances and expenses' },
      { code: 'ergon_manpower',  name: 'Manpower / Machinery',description: 'Resource allocation' },
      { code: 'ergon_ledger',    name: 'Financial Ledger',    description: 'Financial tracking and reporting' },
    ],
  },
  {
    category: 'Workforce',
    color: 'green',
    description: 'HR, Attendance & Leave Management',
    components: [
      { code: 'workforce_profile',    name: 'Profile Management', description: 'Employee profiles and records' },
      { code: 'workforce_attendance', name: 'Attendance',         description: 'Track daily attendance' },
      { code: 'workforce_leave',      name: 'Leave Management',   description: 'Leave requests and approvals' },
    ],
  },
  {
    category: 'Safety & Compliance',
    color: 'red',
    description: 'Permits, Incidents & Observations',
    components: [
      { code: 'ptw',      name: 'Permit to Work',      description: 'Safety permit workflows' },
      { code: 'incident', name: 'Incident Management', description: 'Report and track incidents' },
      { code: 'safety',   name: 'Safety Observation',  description: 'Safety observations and audits' },
      { code: 'training', name: 'Training',             description: 'Employee training and induction' },
    ],
  },
]

const ALL_CODES = MODULE_CATEGORIES.flatMap((c) => c.components.map((m) => m.code))

const COLOR_MAP: Record<string, string> = {
  blue:  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  red:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
}

const HEADER_MAP: Record<string, string> = {
  blue:  'bg-blue-600',
  green: 'bg-green-600',
  red:   'bg-red-600',
}

export default function ProjectModulesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (projectId) loadModules()
  }, [projectId])

  const loadModules = async () => {
    setLoading(true)
    try {
      const data = await masterAdminService.getProjectModules(Number(projectId))
      const map: Record<string, boolean> = {}
      // Seed all known codes as false first, then apply saved values
      ALL_CODES.forEach((code) => { map[code] = false })
      data.forEach((m) => { map[m.module_code] = m.is_enabled })
      setModules(map)
    } catch {
      // Start with all disabled if no data yet
      const map: Record<string, boolean> = {}
      ALL_CODES.forEach((code) => { map[code] = false })
      setModules(map)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (code: string) => {
    setModules((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  const enableAll = () => {
    const map: Record<string, boolean> = {}
    ALL_CODES.forEach((code) => { map[code] = true })
    setModules(map)
  }

  const disableAll = () => {
    const map: Record<string, boolean> = {}
    ALL_CODES.forEach((code) => { map[code] = false })
    setModules(map)
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const payload = ALL_CODES.map((code) => ({
        module_code: code,
        is_enabled: Boolean(modules[code]),
      }))
      const saved = await masterAdminService.saveProjectModules(Number(projectId), payload)
      // Re-sync from DB response
      if (Array.isArray(saved) && saved.length > 0) {
        const map: Record<string, boolean> = { ...modules }
        saved.forEach((m: any) => { map[m.module_code] = m.is_enabled })
        setModules(map)
      }
      toast.success('Module configuration saved successfully')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = ALL_CODES.filter((c) => modules[c]).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/master-admin/projects')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Projects</span>
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Modules</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {enabledCount} of {ALL_CODES.length} modules enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={enableAll}
            className="px-3 py-1.5 text-sm text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={disableAll}
            className="px-3 py-1.5 text-sm text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Disable All
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
            ) : (
              <><Check className="w-4 h-4" /><span>Save Changes</span></>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(enabledCount / ALL_CODES.length) * 100}%` }}
        />
      </div>

      {/* Module Categories */}
      <div className="space-y-6">
        {MODULE_CATEGORIES.map((cat) => {
          const catEnabled = cat.components.filter((c) => modules[c.code]).length
          return (
            <div key={cat.category} className={`rounded-xl border ${COLOR_MAP[cat.color]} overflow-hidden`}>
              {/* Category Header */}
              <div className={`${HEADER_MAP[cat.color]} px-6 py-4 flex items-center justify-between`}>
                <div>
                  <h2 className="text-lg font-bold text-white">{cat.category}</h2>
                  <p className="text-sm text-white/80">{cat.description}</p>
                </div>
                <span className="text-sm font-medium text-white/90 bg-white/20 px-3 py-1 rounded-full">
                  {catEnabled} / {cat.components.length} enabled
                </span>
              </div>

              {/* Components Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {cat.components.map((comp) => {
                  const enabled = Boolean(modules[comp.code])
                  return (
                    <div
                      key={comp.code}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{comp.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{comp.description}</p>
                      </div>
                      <button
                        onClick={() => toggle(comp.code)}
                        className="flex-shrink-0 flex items-center gap-1.5 focus:outline-none"
                        title={enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {enabled ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                        <span className={`text-xs font-medium w-14 ${enabled ? 'text-blue-600' : 'text-gray-400'}`}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-b-xl shadow-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {enabledCount} of {ALL_CODES.length} modules enabled — changes are not saved until you click Save Changes.
        </p>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
          ) : (
            <><Check className="w-4 h-4" /><span>Save Changes</span></>
          )}
        </button>
      </div>
    </div>
  )
}
