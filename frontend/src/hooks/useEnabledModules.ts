import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

export function useEnabledModules() {
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEnabledModules()
  }, [])

  const loadEnabledModules = async () => {
    try {
      const response = await apiClient.get('/api/control-plane/project-modules/enabled/')
      const modules = response.data.map((m: any) => m.module_code)
      setEnabledModules(modules)
    } catch (error) {
      console.error('Failed to load enabled modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const isModuleEnabled = (moduleCode: string) => {
    return enabledModules.includes(moduleCode)
  }

  return { enabledModules, isModuleEnabled, loading }
}
