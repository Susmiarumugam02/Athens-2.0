import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function DiagnosticPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Auth Diagnostic Page</h1>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h2 className="font-semibold text-blue-900 mb-2">Auth State</h2>
              <div className="space-y-1 text-sm">
                <p><strong>isAuthenticated:</strong> {String(isAuthenticated)}</p>
                <p><strong>isLoading:</strong> {String(isLoading)}</p>
                <p><strong>user exists:</strong> {String(!!user)}</p>
              </div>
            </div>

            {user && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h2 className="font-semibold text-green-900 mb-2">User Object</h2>
                <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <h2 className="font-semibold text-purple-900 mb-2">Key Fields</h2>
              <div className="space-y-1 text-sm">
                <p><strong>email:</strong> {(user as any)?.email || 'N/A'}</p>
                <p><strong>user_type:</strong> {(user as any)?.user_type || 'N/A'}</p>
                <p><strong>role_type:</strong> {(user as any)?.role_type || 'N/A'}</p>
                <p><strong>status:</strong> {(user as any)?.status || 'N/A'}</p>
                <p><strong>approval_status:</strong> {(user as any)?.approval_status || 'N/A'}</p>
                <p><strong>induction_attended:</strong> {String((user as any)?.induction_attended ?? 'N/A')}</p>
                <p><strong>is_first_login:</strong> {String((user as any)?.is_first_login ?? 'N/A')}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h2 className="font-semibold text-yellow-900 mb-2">Access Check</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Can access /user/dashboard:</strong>{' '}
                  {(user as any)?.user_type === 'companyuser' &&
                   (user as any)?.role_type === 'user' &&
                   (user as any)?.status === 'active'
                    ? '✅ YES'
                    : '❌ NO'}
                </p>
                {(user as any)?.user_type !== 'companyuser' && (
                  <p className="text-red-600">❌ user_type must be 'companyuser'</p>
                )}
                {(user as any)?.role_type !== 'user' && (
                  <p className="text-red-600">❌ role_type must be 'user'</p>
                )}
                {(user as any)?.status !== 'active' && (
                  <p className="text-red-600">❌ status must be 'active'</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/user/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Dashboard
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
