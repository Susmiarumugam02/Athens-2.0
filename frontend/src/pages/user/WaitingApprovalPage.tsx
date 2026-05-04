import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { Clock, XCircle } from 'lucide-react'

const WaitingApprovalPage: React.FC = () => {
  const { logout, user } = useAuthStore()
  const approvalStatus = (user as any)?.approval_status
  const isRejected = approvalStatus === 'rejected' || window.location.pathname === '/user/rejected'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {isRejected ? (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Rejected</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your account request has been rejected by your administrator.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">
                Please contact your administrator for more information or to request a review.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Waiting for Approval</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your profile is under review. Please wait for your admin to approve your account.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You will be notified once your account is approved. Contact your admin if this takes too long.
              </p>
            </div>
          </>
        )}
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default WaitingApprovalPage
