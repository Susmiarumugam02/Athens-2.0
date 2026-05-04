import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'

const SubscriptionExpired: React.FC = () => {
  const navigate = useNavigate()
  const { logout, subscription } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Inactive
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {subscription?.start && subscription?.end ? (
              <>
                Your subscription period was from <strong>{subscription.start}</strong> to <strong>{subscription.end}</strong>.
                <br />
                It has now expired or not yet started.
              </>
            ) : (
              'Your subscription is currently inactive. Please contact your SuperAdmin to activate your subscription.'
            )}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleLogout} className="w-full">
            Logout
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your SuperAdmin to renew or activate your subscription.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionExpired
