import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTrainingStore } from '../store/trainingStore'
import { AlertCircle, BookOpen, CheckCircle } from 'lucide-react'

export function OnboardingBanner() {
  const { user } = useAuthStore()
  const { status, fetchTrainingStatus } = useTrainingStore()

  useEffect(() => {
    if (user && user.user_type !== 'superadmin' && user.user_type !== 'masteradmin') {
      fetchTrainingStatus()
    }
  }, [user, fetchTrainingStatus])

  // Don't show for admin users
  if (!user || user.user_type === 'superadmin' || user.user_type === 'masteradmin') {
    return null
  }

  // Don't show if training completed
  if (status?.induction_completed && status?.module_access_enabled) {
    return null
  }

  // Calculate progress percentage
  const progress = status?.training_progress?.completion_percentage || 0

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {status?.onboarding_status === 'training_in_progress' ? (
            <BookOpen className="h-6 w-6 text-amber-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-amber-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Welcome to ATHENS 2.0
          </h3>
          
          <p className="text-gray-700 mb-3">
            Complete your mandatory induction training before accessing project modules.
          </p>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Training Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Link
            to="/user/induction-pending"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            {status?.onboarding_status === 'training_in_progress' ? (
              <>
                <BookOpen className="h-4 w-4" />
                Resume Training
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                Start Induction Training
              </>
            )}
          </Link>

          {/* Locked Modules Preview */}
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Locked modules:</span> Attendance, PTW, Incident Management, Safety Observation, and more
            </p>
            <p className="text-xs text-gray-500">
              Complete training to unlock all features
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
