import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import type { User, SecurityAlert } from '../types'
import toast from 'react-hot-toast'

interface SubscriptionStatus {
  is_active: boolean
  start: string | null
  end: string | null
  days_remaining: number | null
  warning: boolean
}

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
  hydrated: boolean
  subscription: SubscriptionStatus | null

  // Actions
  login: (credentials: { email?: string; username?: string; password: string; totp_code?: string }) => Promise<boolean | {requires_2fa: boolean, user_id: number}>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
  setFirstLoginRequired: (required: boolean) => void
  setApprovalPending: (pending: boolean) => void
  setMustChangePassword: (required: boolean) => void
  setForcePasswordReset: (required: boolean) => void
  updateUser: (user: Partial<User>) => void
  clearSecurityAlerts: () => void
  fetchSubscriptionStatus: () => Promise<void>
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
      hydrated: false,
      subscription: null,

      fetchSubscriptionStatus: async () => {
        try {
          const res = await apiClient.get('/api/control-plane/subscription-status/')
          set({ subscription: res.data })
        } catch {
          // On error, default to active so we don't block users unnecessarily
          set({ subscription: { is_active: true, start: null, end: null, days_remaining: null, warning: false } })
        }
      },

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
          
          // Check if tenant is missing for MasterAdmin
          if (data.code === 'TENANT_MISSING') {
            set({ isLoading: false, error: 'Tenant not assigned. Contact Superadmin.' })
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
          
          const userData = data.user || {
            id: data.user_id,
            email: data.username || credentials.email || credentials.username || '',
            user_type: data.django_user_type || data.usertype || 'projectadmin',
            admin_type: data.usertype || undefined,
          }
          
          // Normalize user type and set projectId to null for MasterAdmin
          if (userData.user_type === 'masteradmin' || userData.user_type === 'MASTER_ADMIN' || userData.user_type === 'master') {
            userData.user_type = 'masteradmin'
            userData.projectId = null
          }

          // Always ensure is_first_login and approval_status are on the user object
          userData.is_first_login = userData.is_first_login ?? data.is_first_login ?? false
          userData.approval_status = userData.approval_status ?? data.approval_status ?? 'approved'
          
          // Update state
          const newState = {
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
            mustChangePassword: data.must_change_password || data.must_reset_password || data.isPasswordResetRequired || false,
            forcePasswordReset: data.force_password_reset || data.isPasswordResetRequired || false,
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

          // Fetch subscription status for MasterAdmin after login
          if (userData.user_type === 'masteradmin') {
            try {
              const subRes = await apiClient.get('/api/control-plane/subscription-status/')
              set({ subscription: subRes.data })
            } catch {
              set({ subscription: { is_active: true, start: null, end: null, days_remaining: null, warning: false } })
            }
          }

          return true
        } catch (error: any) {
          const errorData = error.response?.data || {}
          const errorMessage = errorData.error || errorData.message || 'Login failed. Please try again.'
          const isLocked = Boolean(
            errorData.account_locked ||
            errorData.locked ||
            errorData.locked_until ||
            errorMessage.toLowerCase().includes('locked')
          )
          const attemptsRemaining = errorData.attempts_remaining ?? errorData.remaining_attempts ?? null
          const lockoutExpiresAt = errorData.locked_until || errorData.lockout_expires_at || null
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            accountLocked: isLocked,
            remainingAttempts: attemptsRemaining,
            lockoutExpiresAt
          })

          if (isLocked) {
            toast.error('Account locked due to too many failed attempts')
          } else if (errorMessage.includes('Subscription not started yet')) {
            toast.error('Subscription not started yet. Access begins on ' + (errorData.subscription_start_date || 'the start date'))
          } else if (errorMessage.includes('Subscription expired')) {
            toast.error('Subscription expired on ' + (errorData.subscription_end_date || 'the end date'))
          } else if (errorMessage.includes('Tenant not assigned')) {
            toast.error('Tenant not assigned. Contact Superadmin.')
          } else if (attemptsRemaining !== null && attemptsRemaining !== undefined) {
            toast.error(`Login failed. ${attemptsRemaining} attempts remaining.`)
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
          subscription: null,
        })

        toast.success('Logged out successfully')
      },

      initializeAuth: async () => {
        // If Zustand persist already rehydrated user from localStorage, just mark hydrated
        const alreadyHydrated = !!get().user?.email;
        if (alreadyHydrated) {
          set({ hydrated: true });
          return;
        }

        const token = sessionStorage.getItem('_at') || localStorage.getItem('_at')
        const userStr = sessionStorage.getItem('user')
        
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            hydrated: true,
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
              hydrated: true,
            })
          } catch (error) {
            clearTokens()
            sessionStorage.clear()
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              hydrated: true,
            })
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            hydrated: true,
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
