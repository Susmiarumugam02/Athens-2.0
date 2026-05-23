import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function DevelopmentBanner() {
  const bypassInduction = import.meta.env.VITE_BYPASS_INDUCTION === 'true'
  const { user } = useAuthStore()

  // Only show banner for users who require induction (role_type='user')
  const roleType = (user as any)?.role_type
  const requiresInduction = roleType === 'user'

  // Don't show banner if bypass is disabled or user doesn't require induction
  if (!bypassInduction || !requiresInduction) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 animate-pulse" />
        <span>
          ⚠️ DEVELOPMENT MODE: Induction training bypass enabled
        </span>
        <AlertTriangle className="h-4 w-4 animate-pulse" />
      </div>
    </div>
  )
}
