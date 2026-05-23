import { create } from 'zustand'
import { apiClient } from '../lib/api'

interface TrainingStatus {
  training_required: boolean
  induction_completed: boolean
  induction_completed_at: string | null
  induction_score: number | null
  onboarding_status: string
  module_access_enabled: boolean
  training_progress: Record<string, any>
  user_type: string
  admin_type: string | null
}

interface AccessibleModules {
  all_modules_accessible: boolean
  restricted_modules: string[]
  accessible_modules: string[] | string
  training_required?: boolean
  message?: string
}

interface TrainingState {
  status: TrainingStatus | null
  accessibleModules: AccessibleModules | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchTrainingStatus: () => Promise<void>
  fetchAccessibleModules: () => Promise<void>
  markTrainingComplete: (score?: number, trainingData?: any) => Promise<boolean>
  updateProgress: (progress: any) => Promise<void>
  isModuleAccessible: (moduleName: string) => boolean
  reset: () => void
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  status: null,
  accessibleModules: null,
  isLoading: false,
  error: null,

  fetchTrainingStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get('/api/auth/training/status/')
      set({ status: response.data, isLoading: false })
      const { refreshCurrentUser, setMustChangePassword } = (await import('./authStore')).useAuthStore.getState()
      if (response.data?.must_change_password) setMustChangePassword(true)
      void refreshCurrentUser()
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch training status',
        isLoading: false 
      })
    }
  },

  fetchAccessibleModules: async () => {
    try {
      const response = await apiClient.get('/api/auth/training/accessible-modules/')
      set({ accessibleModules: response.data })
    } catch (error: any) {
      console.error('Failed to fetch accessible modules:', error)
    }
  },

  markTrainingComplete: async (score?: number, trainingData?: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post('/api/auth/training/complete/', {
        score,
        training_data: trainingData
      })
      
      // Refresh status
      await get().fetchTrainingStatus()
      await get().fetchAccessibleModules()
      const { refreshCurrentUser } = (await import('./authStore')).useAuthStore.getState()
      await refreshCurrentUser()
      
      set({ isLoading: false })
      return true
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to mark training complete',
        isLoading: false 
      })
      return false
    }
  },

  updateProgress: async (progress: any) => {
    try {
      await apiClient.post('/api/auth/training/progress/', { progress })
      await get().fetchTrainingStatus()
    } catch (error: any) {
      console.error('Failed to update training progress:', error)
    }
  },

  isModuleAccessible: (moduleName: string) => {
    const { accessibleModules } = get()
    
    if (!accessibleModules) return true // Default to accessible if not loaded
    
    if (accessibleModules.all_modules_accessible) return true
    
    if (Array.isArray(accessibleModules.accessible_modules)) {
      return accessibleModules.accessible_modules.includes(moduleName)
    }
    
    return !accessibleModules.restricted_modules.includes(moduleName)
  },

  reset: () => {
    set({
      status: null,
      accessibleModules: null,
      isLoading: false,
      error: null
    })
  }
}))
