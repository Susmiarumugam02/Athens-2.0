import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { athensSustCompanyApi, type ProjectModuleConfig, type AthensSustProject } from '../../../services/athensSustCompanyApi'
import { Button } from '../../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import ProjectSwitcher from './ProjectSwitcher'
import AthensServiceGate from './AthensServiceGate'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'

const ROLE_OPTIONS = ['CLIENT_ADMIN', 'EPC_ADMIN', 'CONTRACTOR_ADMIN']

const DEFAULT_MODULES = [
  'PTW',
  'OBSERVATIONS',
  'INCIDENTS',
  'TRAINING',
  'ESG',
  'INVENTORY',
  'QUALITY'
]

const MenuManagementPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { isEnabled } = useAthensSustainabilityEnabled()
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null)
  const [configs, setConfigs] = React.useState<ProjectModuleConfig[]>([])
  const [cloneProjectId, setCloneProjectId] = React.useState<string>('')
  const [jsonErrors, setJsonErrors] = React.useState<Record<string, string>>({})

  const { data: moduleConfigs, isLoading } = useQuery({
    queryKey: ['athens-module-configs', selectedProjectId],
    queryFn: () => athensSustCompanyApi.getProjectModules(selectedProjectId || undefined),
    enabled: selectedProjectId !== null && isEnabled
  })

  const { data: projects } = useQuery({
    queryKey: ['athens-project-list'],
    queryFn: () => athensSustCompanyApi.listProjects({ status: 'active' }),
    enabled: isEnabled
  })

  const normalizedProjects = Array.isArray(projects) ? projects : (projects?.results || [])

  React.useEffect(() => {
    if (moduleConfigs) {
      const merged = DEFAULT_MODULES.map((moduleKey) => {
        return moduleConfigs.find((config) => config.module_key === moduleKey) || {
          id: 0,
          project: selectedProjectId || 0,
          module_key: moduleKey,
          enabled: false,
          allowed_roles: [],
          feature_flags: {}
        }
      })
      setConfigs(merged)
    }
  }, [moduleConfigs, selectedProjectId])

  const saveMutation = useMutation({
    mutationFn: (payload: ProjectModuleConfig[]) => athensSustCompanyApi.bulkUpdateProjectModules(
      selectedProjectId!,
      payload.map((config) => ({
        module_key: config.module_key,
        enabled: config.enabled,
        allowed_roles: config.allowed_roles,
        feature_flags: config.feature_flags
      }))
    ),
    onSuccess: () => {
      toast.success('Module configuration saved')
      queryClient.invalidateQueries({ queryKey: ['athens-module-configs'] })
      queryClient.invalidateQueries({ queryKey: ['athens-audit-logs'] })
    },
    onError: () => toast.error('Failed to save module configuration')
  })

  const applyPreset = (preset: 'ehs' | 'full') => {
    const enabledSet = preset === 'full'
      ? new Set(DEFAULT_MODULES)
      : new Set(['PTW', 'OBSERVATIONS', 'INCIDENTS', 'TRAINING', 'ESG'])
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
      const sourceConfigs = await athensSustCompanyApi.getProjectModules(sourceId)
      setConfigs(sourceConfigs)
      toast.success('Configuration cloned')
    } catch {
      toast.error('Failed to clone configuration')
    }
  }

  const updateConfig = (moduleKey: string, updates: Partial<ProjectModuleConfig>) => {
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

    saveMutation.mutate(configs)
  }

  return (
    <AthensServiceGate>
      <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Enable modules per project and assign role access.</p>
        </div>
        <ProjectSwitcher onChange={setSelectedProjectId} className="w-full lg:w-64" enabled={isEnabled} />
      </div>

      {!selectedProjectId ? (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Select a project to manage modules.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <LoadingSpinner size="lg" text="Loading module configuration..." />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presets & Clone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => applyPreset('ehs')}>EHS Standard</Button>
                <Button variant="outline" onClick={() => applyPreset('full')}>Full Suite</Button>
                <div className="flex items-center gap-2">
                  <Select
                    value={cloneProjectId}
                    onChange={(value) => setCloneProjectId(value)}
                    options={[
                      { value: '', label: 'Clone from project' },
                      ...normalizedProjects.map((project: AthensSustProject) => ({ value: project.id.toString(), label: project.name }))
                    ]}
                  />
                  <Button variant="outline" onClick={cloneFromProject}>
                    <Copy className="h-4 w-4 mr-2" /> Clone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {configs.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {configs.map((config) => (
                <Card key={config.module_key}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {config.module_key}
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => updateConfig(config.module_key, { enabled: e.target.checked })}
                        />
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </label>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Allowed Roles</p>
                        <div className="flex flex-wrap gap-2 mt-2">
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
                              />
                              {role}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Feature Flags (JSON)</p>
                        <Input
                          value={JSON.stringify(config.feature_flags || {})}
                          onChange={(e) => handleFeatureFlagsChange(config.module_key, e.target.value)}
                        />
                        {jsonErrors[config.module_key] && (
                          <p className="text-xs text-red-500">{jsonErrors[config.module_key]}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">No modules enabled.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Review changes before saving. Updates are logged for audit.
            </div>
            <Button onClick={saveConfigs} disabled={saveMutation.isPending}>
              <Check className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      )}
      </div>
    </AthensServiceGate>
  )
}

export default MenuManagementPage
