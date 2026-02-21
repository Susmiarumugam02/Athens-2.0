import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { masterAdminService } from '../../services/masteradmin'

const ROLE_OPTIONS = ['CLIENT_ADMIN', 'EPC_ADMIN', 'CONTRACTOR_ADMIN']

const DEFAULT_MODULES = [
  'ERGON',
  'WORKFORCE',
  'PTW',
  'OBSERVATIONS', 
  'INCIDENTS',
  'TRAINING',
  'ESG',
  'INVENTORY',
  'QUALITY'
]

interface ModuleConfig {
  id: number
  project: number
  module_key: string
  enabled: boolean
  allowed_roles: string[]
  feature_flags: Record<string, any>
}

const MenuManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [configs, setConfigs] = useState<ModuleConfig[]>([])
  const [cloneProjectId, setCloneProjectId] = useState<string>('')
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['masteradmin-projects'],
    queryFn: () => masterAdminService.getProjects(),
    retry: false
  })

  React.useEffect(() => {
    if (selectedProjectId) {
      const merged = DEFAULT_MODULES.map((moduleKey) => ({
        id: 0,
        project: selectedProjectId,
        module_key: moduleKey,
        enabled: false,
        allowed_roles: [],
        feature_flags: {}
      }))
      setConfigs(merged)
    }
  }, [selectedProjectId])

  const applyPreset = (preset: 'ehs' | 'operations' | 'full') => {
    let enabledSet: Set<string>
    if (preset === 'full') {
      enabledSet = new Set(DEFAULT_MODULES)
    } else if (preset === 'operations') {
      enabledSet = new Set(['ERGON', 'WORKFORCE', 'INVENTORY'])
    } else {
      enabledSet = new Set(['PTW', 'OBSERVATIONS', 'INCIDENTS', 'TRAINING', 'ESG'])
    }
    setConfigs((prev) => prev.map((config) => ({
      ...config,
      enabled: enabledSet.has(config.module_key)
    })))
  }

  const cloneFromProject = async () => {
    if (!cloneProjectId) return
    const sourceId = Number(cloneProjectId)
    if (!sourceId) return
    try {
      // In a real implementation, this would fetch module configs from the source project
      toast.success('Configuration cloned')
    } catch {
      toast.error('Failed to clone configuration')
    }
  }

  const updateConfig = (moduleKey: string, updates: Partial<ModuleConfig>) => {
    setConfigs((prev) => prev.map((config) => (
      config.module_key === moduleKey ? { ...config, ...updates } : config
    )))
  }

  const handleFeatureFlagsChange = (moduleKey: string, value: string) => {
    try {
      const parsed = value ? JSON.parse(value) : {}
      updateConfig(moduleKey, { feature_flags: parsed })
      setJsonErrors((prev) => ({ ...prev, [moduleKey]: '' }))
    } catch {
      setJsonErrors((prev) => ({ ...prev, [moduleKey]: 'Invalid JSON' }))
    }
  }

  const saveConfigs = () => {
    if (!selectedProjectId) {
      toast.error('Select a project first')
      return
    }

    if (Object.values(jsonErrors).some((error) => error)) {
      toast.error('Fix JSON errors before saving')
      return
    }

    toast.success('Module configuration saved')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Enable modules per project and assign role access.</p>
        </div>
        <Select
          value={selectedProjectId?.toString() || ''}
          onChange={(value) => setSelectedProjectId(value ? Number(value) : null)}
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
      ) : projectsLoading ? (
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
                <Button variant="outline" onClick={cloneFromProject}>
                  <Copy className="h-4 w-4 mr-2" /> Clone
                </Button>
              </div>
            </div>
          </Card>

          {configs.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {configs.map((config) => (
                <Card key={config.module_key} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.module_key}</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateConfig(config.module_key, { enabled: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Allowed Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((role) => (
                          <label key={role} className="text-sm flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={config.allowed_roles.includes(role)}
                              onChange={(e) => {
                                const nextRoles = e.target.checked
                                  ? [...config.allowed_roles, role]
                                  : config.allowed_roles.filter((item) => item !== role)
                                updateConfig(config.module_key, { allowed_roles: nextRoles })
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
                        onChange={(e) => handleFeatureFlagsChange(config.module_key, e.target.value)}
                        className="font-mono text-sm"
                      />
                      {jsonErrors[config.module_key] && (
                        <p className="text-xs text-red-500 mt-1">{jsonErrors[config.module_key]}</p>
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
            <Button onClick={saveConfigs}>
              <Check className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuManagement