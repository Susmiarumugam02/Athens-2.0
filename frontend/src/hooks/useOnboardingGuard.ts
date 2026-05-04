import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../store/authStore'

type GuardStatus = 'loading' | 'ok' | 'redirecting'

/**
 * For MasterAdmin users: checks company profile status and redirects accordingly.
 * Returns 'ok' only when the tenant is approved.
 */
export function useOnboardingGuard(): GuardStatus {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState<GuardStatus>('loading')

  useEffect(() => {
    if (!isAuthenticated || !user) { setStatus('ok'); return }
    if (user.user_type !== 'masteradmin') { setStatus('ok'); return }

    apiClient.get('/api/control-plane/company-profile/me/')
      .then(res => {
        const { profile_submitted, approval_status } = res.data
        if (!profile_submitted) {
          setStatus('redirecting')
          navigate('/master-admin/company-setup', { replace: true })
        } else if (approval_status === 'pending') {
          setStatus('redirecting')
          navigate('/master-admin/waiting', { replace: true })
        } else if (approval_status === 'rejected') {
          setStatus('redirecting')
          navigate('/master-admin/company-setup', { replace: true })
        } else {
          setStatus('ok')
        }
      })
      .catch(() => setStatus('ok')) // on error, allow through (don't block)
  }, [isAuthenticated, user, navigate])

  return status
}
