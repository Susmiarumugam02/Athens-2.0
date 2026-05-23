import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { Clock, XCircle, LogOut, Mail } from 'lucide-react'

const WaitingApprovalPage: React.FC = () => {
  const { logout, user } = useAuthStore()
  const approvalStatus = (user as any)?.approval_status
  const isRejected = approvalStatus === 'rejected' || window.location.pathname === '/user/rejected'

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (isRejected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
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
          <button onClick={handleLogout} className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Submitted Successfully</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your profile is under EPC Admin verification.
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-6 text-left space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Approval progress</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Please wait for approval before continuing.
          </p>
          <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-1 mt-2">
            <li>Profile submitted</li>
            <li>Admin review pending</li>
            <li>Induction training locked until approval</li>
            <li>Full platform access locked until verified training completion</li>
          </ul>
        </div>
        <div className="mb-6 flex flex-col gap-2 text-xs text-gray-500">
          <p>Submitted date: {(user as any)?.profile_submitted_at ? new Date((user as any).profile_submitted_at).toLocaleString() : 'Recorded by system'}</p>
          <a className="inline-flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700" href={`mailto:${(user as any)?.created_by_email || ''}`}>
            <Mail className="w-4 h-4" /> Contact admin
          </a>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-red-600 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  )
}

export default WaitingApprovalPage
