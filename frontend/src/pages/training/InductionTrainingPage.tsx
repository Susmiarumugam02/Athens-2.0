import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function InductionPendingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [trainingStatus, setTrainingStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrainingStatus()
    // Poll every 30 seconds to check if admin has marked induction complete
    const interval = setInterval(fetchTrainingStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchTrainingStatus = async () => {
    try {
      const response = await apiClient.get('/api/auth/training/status/')
      setTrainingStatus(response.data)
      
      // If induction attended by admin OR status is active, redirect to dashboard
      if (response.data.induction_attended || response.data.status === 'active') {
        navigate('/user/dashboard')
      }
    } catch (error) {
      console.error('Failed to fetch training status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Induction Training Pending</h1>
              <p className="text-orange-100 text-sm">Mandatory offline training required</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Status Badge */}
          <div className="mb-6 inline-flex items-center px-4 py-2 bg-orange-100 border border-orange-300 rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2" />
            <span className="text-sm font-medium text-orange-800">Waiting for induction attendance</span>
          </div>

          {/* Main Message */}
          <div className="space-y-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-green-900">Your account has been approved!</p>
                  <p className="text-sm text-green-700 mt-1">You can now proceed to the next step.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Step: Offline Induction Training</h3>
              <p className="text-gray-700 mb-4">
                You must attend <strong>mandatory offline induction training</strong> conducted by your administrator before accessing the platform.
              </p>
              
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">What to do:</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Contact your admin/trainer to schedule induction training</li>
                  <li>Attend the physical induction session</li>
                  <li>Complete all safety briefings and procedures</li>
                  <li>Wait for admin to mark your attendance</li>
                </ol>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-900">Important</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Platform access will be automatically enabled once your admin marks your induction attendance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Account Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Status:</span> <span className="text-orange-600 font-medium">Pending Induction</span></p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
            <p className="text-sm text-gray-600">
              Please contact your project administrator or training coordinator to schedule your induction session.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={fetchTrainingStatus}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Status</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
