import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTrainingStore } from '../store/trainingStore'

interface TrainingGuardProps {
  children: React.ReactNode
}

const ALWAYS_ACCESSIBLE_ROUTES = [
  '/dashboard',
  '/training',
  '/profile',
  '/logout',
  '/settings',
  '/change-password'
]

export function TrainingGuard({ children }: TrainingGuardProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  const { status, fetchTrainingStatus, isModuleAccessible } = useTrainingStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkTraining = async () => {
      if (user) {
        await fetchTrainingStatus()
      }
      setIsChecking(false)
    }
    checkTraining()
  }, [user, fetchTrainingStatus])

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Admin users bypass training requirement
  if (user?.user_type === 'superadmin' || user?.user_type === 'masteradmin') {
    return <>{children}</>
  }

  // Check if current route is always accessible
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_ROUTES.some(route => 
    location.pathname.startsWith(route)
  )

  if (isAlwaysAccessible) {
    return <>{children}</>
  }

  // If training not completed, redirect to induction pending page
  if (status && status.training_required && !status.induction_completed) {
    // Extract module name from path
    const pathParts = location.pathname.split('/')
    const moduleName = pathParts[1] || ''

    // Check if trying to access restricted module
    if (!isModuleAccessible(moduleName)) {
      return <Navigate to="/user/induction-pending" replace state={{ from: location }} />
    }
  }

  return <>{children}</>
}
