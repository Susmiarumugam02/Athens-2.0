import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import type { User, SecurityAlert } from '../types'
import toast from 'react-hot-toast'
import { normalizeCompletedInductionAccess } from '../utils/accessState'

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
  refreshCurrentUser: () => Promise<void>
  clearSecurityAlerts: () => void
  fetchSubscriptionStatus: () => Promise<void>
}

const passwordRequiredFrom = (data: any) => Boolean(
  data?.must_change_password ||
  data?.must_reset_password ||
  data?.is_password_reset_required ||
  data?.isPasswordResetRequired ||
  data?.is_temporary_password
)

const persistAuthSnapshot = (state: Partial<AuthState> & { user?: User | null }) => {
  if (state.user) {
    sessionStorage.setItem('user', JSON.stringify(state.user))
    sessionStorage.setItem('auth_user', JSON.stringify(state.user))
    localStorage.setItem('user', JSON.stringify(state.user))
    localStorage.setItem('auth_user', JSON.stringify(state.user))
  }
  localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: state.user ?? null,
      isAuthenticated: state.isAuthenticated ?? true,
      firstLoginRequired: state.firstLoginRequired ?? false,
      approvalPending: state.approvalPending ?? false,
      approvalStatus: state.approvalStatus ?? null,
      mustChangePassword: state.mustChangePassword ?? false,
      forcePasswordReset: state.forcePasswordReset ?? false,
    },
    version: 0,
  }))
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
          userData.approval_status = userData.approval_status ?? data.approval_status ?? 'pending'
          userData.profile_completed = userData.profile_completed ?? data.profile_completed ?? false
          userData.induction_completed = userData.induction_completed ?? data.induction_completed ?? false
          userData.induction_attended = userData.induction_attended ?? data.induction_attended ?? false
          userData.status = userData.status ?? data.status ?? 'pending_profile'
          userData.module_access_enabled = userData.module_access_enabled ?? data.module_access_enabled ?? false
          userData.attendance_verified = userData.attendance_verified ?? data.attendance_verified ?? false
          userData.modules_unlocked = userData.modules_unlocked ?? data.modules_unlocked ?? userData.module_access_enabled ?? false
          userData.access_status = userData.access_status ?? data.access_status ?? (userData.modules_unlocked ? 'active' : 'restricted')
          userData.onboarding_completed = userData.onboarding_completed ?? data.onboarding_completed ?? (data.onboarding_status === 'completed')
          userData.induction_status = userData.induction_status ?? data.induction_status ?? (userData.induction_completed ? 'completed' : undefined)
          userData.onboarding_status = userData.onboarding_status ?? data.onboarding_status ?? 'pending_training'
          userData.profile_status = userData.profile_status ?? data.profile_status ?? 'incomplete'
          userData.workflow_approval_status = userData.workflow_approval_status ?? data.workflow_approval_status ?? undefined
          userData.training_status = userData.training_status ?? data.training_status ?? 'not_started'
          userData.access_level = userData.access_level ?? data.access_level ?? 'restricted'
          userData.attendance_status = userData.attendance_status ?? data.attendance_status ?? 'pending'
          userData.is_autogenerated_password = userData.is_autogenerated_password ?? data.is_autogenerated_password ?? false
          userData.is_temporary_password = userData.is_temporary_password ?? data.is_temporary_password ?? false
          userData.password_changed = userData.password_changed ?? data.password_changed ?? false
          userData.must_change_password = userData.must_change_password ?? data.must_change_password ?? data.must_reset_password ?? false

          const normalizedUserData = normalizeCompletedInductionAccess(userData)
          const mustChangePassword = passwordRequiredFrom(normalizedUserData) || passwordRequiredFrom(data)
          
          // Update state
          const newState = {
            user: normalizedUserData,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
            mustChangePassword,
            forcePasswordReset: data.force_password_reset || data.isPasswordResetRequired || false,
          }
          
          set(newState)

          // Store in session
          sessionStorage.setItem('user', JSON.stringify(normalizedUserData))
          sessionStorage.setItem('auth_user', JSON.stringify(normalizedUserData))
          localStorage.setItem('user', JSON.stringify(normalizedUserData))
          localStorage.setItem('auth_user', JSON.stringify(normalizedUserData))
          sessionStorage.setItem('next_route', data.next_route || '')
          
          // Force immediate persistence
          persistAuthSnapshot(newState)

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
        const token = sessionStorage.getItem('_at') || localStorage.getItem('_at')

        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false, hydrated: true })
          return
        }

        const syncFromBackend = async () => {
          try {
            const res = await apiClient.getCurrentUser()
            const backendUser = normalizeCompletedInductionAccess(res.data)
            const mustChangePassword = passwordRequiredFrom(backendUser)
            const nextState = {
              user: backendUser,
              isAuthenticated: true,
              isLoading: false,
              mustChangePassword,
              forcePasswordReset: Boolean(backendUser.is_password_reset_required),
              hydrated: true,
            }
            set(nextState)
            persistAuthSnapshot({ ...get(), ...nextState })
          } catch (_) {
            set({ hydrated: true })
          }
        }

        // Prefer auth-storage (written by updateUser with correct partialize shape)
        // over sessionStorage which is tab-scoped and cleared on location.replace.
        let persistedState = null
        try {
          const persistedData = localStorage.getItem('auth-storage')
          if (persistedData) persistedState = JSON.parse(persistedData).state
        } catch (_) {}

        const userFromStorage = persistedState?.user
          || (() => { try { const s = sessionStorage.getItem('user'); return s ? JSON.parse(s) : null } catch { return null } })()
          || (() => { try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null } catch { return null } })()

        if (token && userFromStorage) {
          try {
            const normalizedStoredUser = normalizeCompletedInductionAccess(userFromStorage)
            set({
              user: normalizedStoredUser,
              isAuthenticated: true,
              isLoading: false,
              firstLoginRequired: persistedState?.firstLoginRequired || false,
              approvalPending: persistedState?.approvalPending || false,
              approvalStatus: persistedState?.approvalStatus || null,
              mustChangePassword: passwordRequiredFrom(normalizedStoredUser) || persistedState?.mustChangePassword || false,
              forcePasswordReset: persistedState?.forcePasswordReset || false,
              hydrated: true,
            })
            void syncFromBackend()
          } catch (_) {
            clearTokens()
            sessionStorage.clear()
            set({ user: null, isAuthenticated: false, isLoading: false, hydrated: true })
          }
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, hydrated: true })
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
        persistAuthSnapshot(get())
      },

      setForcePasswordReset: (required: boolean) => {
        set({ forcePasswordReset: required })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          const nextMustChangePassword = userData.must_change_password !== undefined || (userData as any).is_temporary_password !== undefined
            ? passwordRequiredFrom(updatedUser)
            : get().mustChangePassword
          set({ user: updatedUser, mustChangePassword: nextMustChangePassword })
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
          sessionStorage.setItem('auth_user', JSON.stringify(updatedUser))
          localStorage.setItem('user', JSON.stringify(updatedUser))
          localStorage.setItem('auth_user', JSON.stringify(updatedUser))
          // Write only serializable partialize shape — spreading get() includes functions
          // which JSON.stringify silently drops, corrupting the persisted state on reload.
          const s = get()
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: updatedUser,
              isAuthenticated: s.isAuthenticated,
              firstLoginRequired: s.firstLoginRequired,
              approvalPending: s.approvalPending,
              approvalStatus: s.approvalStatus,
              mustChangePassword: nextMustChangePassword,
              forcePasswordReset: s.forcePasswordReset,
            },
            version: 0,
          }))
        }
      },

      refreshCurrentUser: async () => {
        const res = await apiClient.getCurrentUser()
        const backendUser = normalizeCompletedInductionAccess(res.data)
        const mustChangePassword = passwordRequiredFrom(backendUser)
        const nextState = {
          user: backendUser,
          isAuthenticated: true,
          isLoading: false,
          mustChangePassword,
          forcePasswordReset: Boolean((backendUser as any).is_password_reset_required),
        }
        set(nextState)
        persistAuthSnapshot({ ...get(), ...nextState })
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
      // Mark hydrated=true as soon as persist middleware finishes reading localStorage.
      // This fires synchronously before the first React render in most cases,
      // preventing the guard race condition that causes white screens.
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    }
  )
)
