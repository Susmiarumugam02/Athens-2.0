import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'
import { UserPlus, Check, X, Key, Trash2, Eye } from 'lucide-react'

interface ManagedUser {
  id: number
  username: string
  email: string
  name: string
  surname: string
  department: string
  designation: string
  phone_number: string
  company_type: string
  approval_status: string
  is_first_login: boolean
  is_active: boolean
  created_at: string
}

interface NewCredentials { username: string; email: string; password: string }

const BADGE: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const ProfileManagement: React.FC = () => {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [credentials, setCredentials] = useState<NewCredentials | null>(null)
  const [createForm, setCreateForm] = useState({ username: '', email: '', name: '' })
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<'all' | 'pending'>('all')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/auth/projectadmin/users/')
      setUsers(Array.isArray(res.data) ? res.data : [])
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!createForm.username) { toast.error('Username is required'); return }
    setCreating(true)
    try {
      const res = await apiClient.post('/api/auth/projectadmin/users/', createForm)
      setCredentials({ username: res.data.username, email: res.data.email, password: res.data.password })
      setShowCreate(false)
      setCreateForm({ username: '', email: '', name: '' })
      loadUsers()
      toast.success('User created successfully')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create user')
    } finally { setCreating(false) }
  }

  const handleApprove = async (id: number) => {
    try {
      await apiClient.post(`/api/auth/projectadmin/approvals/${id}/approve/`)
      toast.success('User approved')
      loadUsers()
    } catch { toast.error('Failed to approve') }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Reject this user?')) return
    try {
      await apiClient.post(`/api/auth/projectadmin/approvals/${id}/reject/`)
      toast.success('User rejected')
      loadUsers()
    } catch { toast.error('Failed to reject') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user permanently?')) return
    try {
      await apiClient.delete(`/api/auth/projectadmin/users/${id}/delete/`)
      toast.success('User deleted')
      loadUsers()
    } catch { toast.error('Failed to delete') }
  }

  const handleResetPassword = async (id: number) => {
    try {
      const res = await apiClient.post(`/api/auth/projectadmin/users/${id}/reset-password/`)
      toast.success(`New password: ${res.data.password}`, { duration: 10000 })
    } catch { toast.error('Failed to reset password') }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const displayed = tab === 'pending'
    ? users.filter(u => u.approval_status === 'pending')
    : users

  const adminType = (user as any)?.admin_type || 'client'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage users under your {adminType.toUpperCase()} company
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Create User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'pending'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'all' ? 'All Users' : `Pending Approvals (${users.filter(u => u.approval_status === 'pending').length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {tab === 'pending' ? 'No pending approvals' : 'No users yet. Create your first user.'}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Username', 'Name', 'Department', 'Designation', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayed.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.department || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.designation || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${BADGE[u.approval_status] || BADGE.pending}`}>
                      {u.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.approval_status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(u.id)} title="Approve"
                            className="text-green-600 hover:text-green-800 dark:text-green-400">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(u.id)} title="Reject"
                            className="text-red-600 hover:text-red-800 dark:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleResetPassword(u.id)} title="Reset Password"
                        className="text-amber-600 hover:text-amber-800 dark:text-amber-400">
                        <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} title="Delete"
                        className="text-red-600 hover:text-red-800 dark:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create User</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                <input type="text" value={createForm.username}
                  onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (optional)</label>
                <input type="email" value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input type="text" value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg">
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">⚠️ Save these credentials now — password shown only once!</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Username', value: credentials.username },
                { label: 'Email',    value: credentials.email },
                { label: 'Password', value: credentials.password },
              ].map(item => (
                <div key={item.label}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{item.label}</label>
                  <div className="flex gap-2">
                    <input readOnly value={item.value}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" />
                    <button onClick={() => copyToClipboard(item.value, item.label)}
                      className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setCredentials(null)}
              className="w-full mt-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileManagement
