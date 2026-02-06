import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import type { User, SecurityAlert } from '../types'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  firstLoginRequired: boolean
  approvalPending: boolean
  approvalStatus: string | null
  mustChangePassword: boolean
  forcePasswordReset: boolean
  accountLocked: boolean
  remainingAttempts: number | null
  lockoutExpiresAt: string | null
  passwordExpiresInDays: number | null
  passwordExpiresAt: string | null
  securityAlerts: SecurityAlert[]
  trustedDevice: boolean
  deviceId: string | null

  // Actions
  login: (credentials: { email: string; password: string; totp_code?: string }) => Promise<boolean | {requires_2fa: boolean, user_id: number}>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
  setFirstLoginRequired: (required: boolean) => void
  setApprovalPending: (pending: boolean) => void
  setMustChangePassword: (required: boolean) => void
  setForcePasswordReset: (required: boolean) => void
  updateUser: (user: Partial<User>) => void
  clearSecurityAlerts: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      firstLoginRequired: false,
      approvalPending: false,
      approvalStatus: null,
      mustChangePassword: false,
      forcePasswordReset: false,
      accountLocked: false,
      remainingAttempts: null,
      lockoutExpiresAt: null,
      passwordExpiresInDays: null,
      passwordExpiresAt: null,
      securityAlerts: [],
      trustedDevice: false,
      deviceId: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.login(credentials)
          const data = response.data
          
          // Update security state
          set({
            accountLocked: data.account_locked || false,
            remainingAttempts: data.remaining_attempts || null,
            lockoutExpiresAt: data.lockout_expires_at || null,
            passwordExpiresInDays: data.password_expires_in_days || null,
            passwordExpiresAt: data.password_expires_at || null,
            securityAlerts: data.security_alerts || [],
            trustedDevice: data.trusted_device || false,
            deviceId: data.device_id || null
          })
          
          // Check if account is locked
          if (data.account_locked) {
            set({ isLoading: false, error: 'Account is temporarily locked' })
            return false
          }
          
          // Check if 2FA is required
          if (data.requires_2fa === true) {
            set({ isLoading: false })
            return {
              requires_2fa: true,
              user_id: data.user_id || data.id
            }
          }

          // Check if we have access token
          if (!data.access) {
            set({ isLoading: false, error: 'Invalid login response - no access token' })
            return false
          }

          // Store tokens
          setTokens(data.access, data.refresh)
          
          const userData = data.user
          
          // Update state
          const newState = {
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
            mustChangePassword: data.must_change_password || data.must_reset_password || false,
            forcePasswordReset: data.force_password_reset || false,
          }
          
          set(newState)

          // Store in session
          sessionStorage.setItem('user', JSON.stringify(userData))
          sessionStorage.setItem('next_route', data.next_route || '')
          
          // Force immediate persistence
          const stateToStore = {
            state: newState,
            version: 0
          }
          localStorage.setItem('auth-storage', JSON.stringify(stateToStore))

          toast.success(`Welcome back, ${userData.email}!`)
          return true
        } catch (error: any) {
          const errorData = error.response?.data || {}
          const errorMessage = errorData.error || errorData.message || 'Login failed. Please try again.'
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            accountLocked: errorData.locked || false,
            remainingAttempts: errorData.attempts_remaining || null,
            lockoutExpiresAt: errorData.locked_until || null
          })

          if (errorData.locked) {
            toast.error('Account locked due to too many failed attempts')
          } else if (errorData.attempts_remaining !== undefined) {
            toast.error(`Login failed. ${errorData.attempts_remaining} attempts remaining.`)
          } else {
            toast.error(errorMessage)
          }
          
          return false
        }
      },

      logout: () => {
        clearTokens()
        sessionStorage.clear()
        localStorage.removeItem('auth-storage')

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          firstLoginRequired: false,
          approvalPending: false,
          approvalStatus: null,
          mustChangePassword: false,
          forcePasswordReset: false,
          accountLocked: false,
          remainingAttempts: null,
          lockoutExpiresAt: null,
          passwordExpiresInDays: null,
          passwordExpiresAt: null,
          securityAlerts: [],
          trustedDevice: false,
          deviceId: null,
        })

        toast.success('Logged out successfully')
      },

      initializeAuth: async () => {
        const token = sessionStorage.getItem('_at') || localStorage.getItem('_at')
        const userStr = sessionStorage.getItem('user')
        
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return
        }
        
        let persistedState = null
        try {
          const persistedData = localStorage.getItem('auth-storage')
          if (persistedData) {
            persistedState = JSON.parse(persistedData).state
          }
        } catch (error) {
          console.warn('Failed to parse persisted auth state:', error)
        }

        if (token && (userStr || persistedState?.user)) {
          try {
            const user = userStr ? JSON.parse(userStr) : persistedState?.user
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              firstLoginRequired: persistedState?.firstLoginRequired || false,
              approvalPending: persistedState?.approvalPending || false,
              approvalStatus: persistedState?.approvalStatus || null,
              mustChangePassword: persistedState?.mustChangePassword || false,
              forcePasswordReset: persistedState?.forcePasswordReset || false,
            })
          } catch (error) {
            clearTokens()
            sessionStorage.clear()
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setFirstLoginRequired: (required: boolean) => {
        set({ firstLoginRequired: required })
      },

      setApprovalPending: (pending: boolean) => {
        set({ approvalPending: pending })
      },

      setMustChangePassword: (required: boolean) => {
        set({ mustChangePassword: required })
      },

      setForcePasswordReset: (required: boolean) => {
        set({ forcePasswordReset: required })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
        }
      },

      clearSecurityAlerts: () => {
        set({ securityAlerts: [] })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        firstLoginRequired: state.firstLoginRequired,
        approvalPending: state.approvalPending,
        approvalStatus: state.approvalStatus,
        mustChangePassword: state.mustChangePassword,
        forcePasswordReset: state.forcePasswordReset,
      }),
    }
  )
)
