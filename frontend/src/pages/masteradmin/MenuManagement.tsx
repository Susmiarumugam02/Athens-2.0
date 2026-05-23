import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { masterAdminService } from '../../services/masteradmin'

const ROLE_OPTIONS = ['CLIENT_ADMIN', 'EPC_ADMIN', 'CONTRACTOR_ADMIN']

// Module codes must match backend ProjectModule.MODULE_CHOICES exactly
const DEFAULT_MODULES = [
  { code: 'ergon_tasks',        label: 'ERGON - Task Management' },
  { code: 'ergon_planner',      label: 'ERGON - Daily Planner' },
  { code: 'ergon_followups',    label: 'ERGON - Follow-ups' },
  { code: 'ergon_advance',      label: 'ERGON - Advance/Expenses' },
  { code: 'ergon_manpower',     label: 'ERGON - Manpower/Machinery' },
  { code: 'ergon_ledger',       label: 'ERGON - Financial Ledger' },
  { code: 'workforce_profile',  label: 'Workforce - Profile Management' },
  { code: 'workforce_attendance', label: 'Workforce - Attendance' },
  { code: 'workforce_leave',    label: 'Workforce - Leave Management' },
  { code: 'ptw',                label: 'Permit to Work' },
  { code: 'incident',           label: 'Incident Management' },
  { code: 'safety',             label: 'Safety Observation' },
  { code: 'training',           label: 'Training' },
]

const PRESET_MAPS: Record<string, Set<string>> = {
  full:       new Set(DEFAULT_MODULES.map((m) => m.code)),
  operations: new Set(['ergon_tasks', 'ergon_planner', 'ergon_followups', 'ergon_advance', 'ergon_manpower', 'ergon_ledger', 'workforce_profile', 'workforce_attendance', 'workforce_leave']),
  ehs:        new Set(['ptw', 'incident', 'safety', 'training']),
}

interface ModuleConfig {
  module_code: string
  label: string
  is_enabled: boolean
  allowed_roles: string[]
  feature_flags: Record<string, any>
}

const buildDefaultConfigs = (enabledCodes: Set<string> = new Set()): ModuleConfig[] =>
  DEFAULT_MODULES.map((m) => ({
    module_code: m.code,
    label: m.label,
    is_enabled: enabledCodes.has(m.code),
    allowed_roles: [],
    feature_flags: {},
  }))

const MenuManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [configs, setConfigs] = useState<ModuleConfig[]>([])
  const [cloneProjectId, setCloneProjectId] = useState<string>('')
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [modulesLoading, setModulesLoading] = useState(false)

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['masteradmin-projects'],
    queryFn: () => masterAdminService.getProjects(),
    retry: false,
  })

  // Load existing module state from backend when project changes
  const loadModules = async (projectId: number) => {
    setModulesLoading(true)
    try {
      const saved = await masterAdminService.getProjectModules(projectId)
      const enabledCodes = new Set(saved.filter((m) => m.is_enabled).map((m) => m.module_code))
      setConfigs(buildDefaultConfigs(enabledCodes))
    } catch {
      // Backend returned nothing yet — start with all disabled
      setConfigs(buildDefaultConfigs())
    } finally {
      setModulesLoading(false)
    }
  }

  const handleProjectChange = (value: string) => {
    const id = value ? Number(value) : null
    setSelectedProjectId(id)
    setJsonErrors({})
    if (id) loadModules(id)
    else setConfigs([])
  }

  const applyPreset = (preset: 'ehs' | 'operations' | 'full') => {
    const enabledSet = PRESET_MAPS[preset]
    setConfigs((prev) =>
      prev.map((c) => ({ ...c, is_enabled: enabledSet.has(c.module_code) }))
    )
  }

  const cloneFromProject = async () => {
    if (!cloneProjectId) return
    const sourceId = Number(cloneProjectId)
    if (!sourceId) return
    try {
      const saved = await masterAdminService.getProjectModules(sourceId)
      const enabledCodes = new Set(saved.filter((m) => m.is_enabled).map((m) => m.module_code))
      setConfigs((prev) => prev.map((c) => ({ ...c, is_enabled: enabledCodes.has(c.module_code) })))
      toast.success('Configuration cloned from selected project')
    } catch {
      toast.error('Failed to clone configuration')
    }
  }

  const updateConfig = (moduleCode: string, updates: Partial<ModuleConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.module_code === moduleCode ? { ...c, ...updates } : c))
    )
  }

  const handleFeatureFlagsChange = (moduleCode: string, value: string) => {
    try {
      const parsed = value ? JSON.parse(value) : {}
      updateConfig(moduleCode, { feature_flags: parsed })
      setJsonErrors((prev) => ({ ...prev, [moduleCode]: '' }))
    } catch {
      setJsonErrors((prev) => ({ ...prev, [moduleCode]: 'Invalid JSON' }))
    }
  }

  const saveConfigs = async () => {
    if (!selectedProjectId) {
      toast.error('Select a project first')
      return
    }
    if (Object.values(jsonErrors).some((e) => e)) {
      toast.error('Fix JSON errors before saving')
      return
    }

    // Snapshot the full config list at call time — avoids stale closure issues
    const payload = configs.map((c) => ({
      module_code: c.module_code,
      is_enabled: c.is_enabled,
    }))

    setSaving(true)
    try {
      // Single atomic request — all modules saved in one DB transaction
      const saved = await masterAdminService.saveProjectModules(selectedProjectId, payload)

      // Re-sync UI from the actual DB response, not from local state
      if (Array.isArray(saved) && saved.length > 0) {
        const savedMap = new Map(saved.map((m) => [m.module_code, m.is_enabled]))
        setConfigs((prev) =>
          prev.map((c) => ({
            ...c,
            is_enabled: savedMap.has(c.module_code)
              ? Boolean(savedMap.get(c.module_code))
              : c.is_enabled,
          }))
        )
      }

      toast.success('Module configuration saved successfully')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save configuration'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = projectsLoading || modulesLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Enable modules per project and assign role access.</p>
        </div>
        <Select
          value={selectedProjectId?.toString() || ''}
          onChange={handleProjectChange}
          className="w-64"
        >
          <option value="">Select Project</option>
          {(projects || []).map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </Select>
      </div>

      {!selectedProjectId ? (
        <Card className="p-6">
          <p className="text-sm text-gray-500">Select a project to manage modules.</p>
        </Card>
      ) : isLoading ? (
        <LoadingSpinner size="lg" text="Loading module configuration..." />
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Presets & Clone</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => applyPreset('operations')}>Operations (ERGON + Workforce)</Button>
              <Button variant="outline" onClick={() => applyPreset('ehs')}>EHS Standard</Button>
              <Button variant="outline" onClick={() => applyPreset('full')}>Full Suite</Button>
              <div className="flex items-center gap-2">
                <Select
                  value={cloneProjectId}
                  onChange={(value) => setCloneProjectId(value)}
                  className="w-48"
                >
                  <option value="">Clone from project</option>
                  {(projects || []).map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.projectName}
                    </option>
                  ))}
                </Select>
                <Button variant="outline" onClick={cloneFromProject} disabled={!cloneProjectId}>
                  <Copy className="h-4 w-4 mr-2" /> Clone
                </Button>
              </div>
            </div>
          </Card>

          {configs.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {configs.map((config) => (
                <Card key={config.module_code} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.label}</h3>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.is_enabled}
                        onChange={(e) => updateConfig(config.module_code, { is_enabled: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      {config.is_enabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Allowed Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((role) => (
                          <label key={role} className="text-sm flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.allowed_roles.includes(role)}
                              onChange={(e) => {
                                const nextRoles = e.target.checked
                                  ? [...config.allowed_roles, role]
                                  : config.allowed_roles.filter((r) => r !== role)
                                updateConfig(config.module_code, { allowed_roles: nextRoles })
                              }}
                              className="rounded border-gray-300"
                            />
                            {role}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Feature Flags (JSON)</p>
                      <Input
                        value={JSON.stringify(config.feature_flags || {})}
                        onChange={(e) => handleFeatureFlagsChange(config.module_code, e.target.value)}
                        className="font-mono text-sm"
                      />
                      {jsonErrors[config.module_code] && (
                        <p className="text-xs text-red-500 mt-1">{jsonErrors[config.module_code]}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <p className="text-sm text-gray-500">No modules configured.</p>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Review changes before saving. Updates are logged for audit.
            </div>
            <Button onClick={saveConfigs} disabled={saving}>
              {saving ? (
                <><LoadingSpinner size="sm" /><span className="ml-2">Saving...</span></>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuManagement
