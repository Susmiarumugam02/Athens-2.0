import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const WaitingApprovalPage: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [status, setStatus] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await apiClient.get('/api/control-plane/company-profile/me/')
        const s = res.data.approval_status
        setStatus(s)
        setReason(res.data.rejection_reason || null)
        if (s === 'approved') {
          navigate('/master-admin')
        }
      } catch {
        // silent
      }
    }
    poll()
    const interval = setInterval(poll, 15000) // poll every 15s
    return () => clearInterval(interval)
  }, [navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleResubmit = () => navigate('/master-admin/company-setup')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center">
        {status === 'rejected' ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">
              Registration Rejected
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your company registration was rejected by the SuperAdmin.
            </p>
            {reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Reason:</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{reason}</p>
              </div>
            )}
            <button
              onClick={handleResubmit}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-3"
            >
              Update & Resubmit
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Waiting for Approval
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your company registration is under review. You will get access once approved by SuperAdmin.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-8">
              <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              Checking status automatically...
            </div>
          </>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default WaitingApprovalPage
