import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import tokenManager from '../lib/tokenManager'

export function useEnabledModules() {
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Patch C: Only fetch if token exists
    if (!tokenManager.hasTokens()) {
      setLoading(false)
      return
    }
    loadEnabledModules()
  }, [])

  const loadEnabledModules = async () => {
    try {
      const response = await apiClient.get('/api/system/tenant-services/')
      const modules = response.data.map((m: any) => m.code)
      setEnabledModules(modules)
    } catch (error) {
      // Don't spam console for expected no-token case
      if ((error as any)?.code !== 'NO_AUTH_TOKEN') {
      }
      setEnabledModules([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const isModuleEnabled = (moduleCode: string) => {
    return enabledModules.includes(moduleCode)
  }

  return { enabledModules, isModuleEnabled, loading }
}
