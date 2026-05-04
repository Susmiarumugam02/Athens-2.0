import React, { useEffect, useState } from 'react'
import { UserPlus, CheckCircle, XCircle, Clock, Users, Trash2, RefreshCw } from 'lucide-react'
import { profileManagementApi, type ManagedUser } from '../../services/profileManagementApi'
import toast from 'react-hot-toast'

type Tab = 'users' | 'approvals'

const ProfileManagementAdminPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [pending, setPending] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', name: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; username: string; password: string } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, pendingRes] = await Promise.all([
        profileManagementApi.listUsers(),
        profileManagementApi.listPendingApprovals(),
      ])
      setUsers(usersRes.data as ManagedUser[])
      setPending(pendingRes.data as ManagedUser[])
    } catch {
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim()) { toast.error('Username is required.'); return }
    setCreating(true)
    try {
      const res = await profileManagementApi.createUser(form)
      setCreatedCreds({ email: res.data.email, username: res.data.username, password: res.data.password })
      setForm({ username: '', email: '', name: '' })
      toast.success('User created.')
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (userId: number) => {
    try {
      await profileManagementApi.approveUser(userId)
      toast.success('User approved.')
      fetchData()
    } catch { toast.error('Failed to approve.') }
  }

  const handleReject = async (userId: number) => {
    try {
      await profileManagementApi.rejectUser(userId)
      toast.success('User rejected.')
      fetchData()
    } catch { toast.error('Failed to reject.') }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Delete this user?')) return
    try {
      await profileManagementApi.deleteUser(userId)
      toast.success('User deleted.')
      fetchData()
    } catch { toast.error('Failed to delete.') }
  }

  const handleResetPassword = async (userId: number) => {
    try {
      const res = await profileManagementApi.resetUserPassword(userId)
      toast.success(`New password: ${res.data.password}`)
    } catch { toast.error('Failed to reset password.') }
  }

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] || ''}`}>{s}</span>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Management</h1>

      {/* Create User */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Create New User
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            placeholder="Username *"
            className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="Email (optional)"
            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Display name (optional)"
            className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>

        {createdCreds && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm space-y-1">
            <p className="font-semibold text-green-800 dark:text-green-300">✅ User Created — Share credentials:</p>
            <p className="text-green-700 dark:text-green-400">Username: <strong>{createdCreds.username}</strong></p>
            {createdCreds.email && <p className="text-green-700 dark:text-green-400">Email: <strong>{createdCreds.email}</strong></p>}
            <p className="text-green-700 dark:text-green-400">Password: <strong>{createdCreds.password}</strong></p>
            <button onClick={() => setCreatedCreds(null)} className="text-xs text-green-600 underline">Dismiss</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {([
          ['users', 'All Users', Users, users.length],
          ['approvals', 'Pending Approvals', Clock, pending.length],
        ] as const).map(([key, label, Icon, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full text-white ${key === 'approvals' ? 'bg-red-500' : 'bg-gray-400'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      ) : tab === 'users' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['Username', 'Name', 'Department', 'Designation', 'Status', 'Profile', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users yet.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.designation || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(u.approval_status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.is_first_login ? '⏳ Pending' : '✅ Done'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        title="Reset password"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        title="Delete user"
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['Username', 'Name', 'Department', 'Designation', 'Phone', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pending.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pending approvals.</td></tr>
              ) : pending.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.name} {u.surname}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.department}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.designation}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.phone_number || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(u.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProfileManagementAdminPage
