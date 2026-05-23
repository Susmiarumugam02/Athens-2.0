import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Users, Clock, CheckCircle, XCircle, UserCheck, UserX,
  RefreshCw, Eye, Shield, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react'

interface ManagedUser {
  id: number
  username: string
  email: string
  name: string
  surname: string
  department: string
  designation: string
  phone_number: string
  employee_id: string
  emergency_contact: string
  blood_group: string
  address: string
  safety_experience: string
  skills: string
  company_type: string
  approval_status: 'pending' | 'approved' | 'rejected'
  status: string
  profile_completed: boolean
  profile_submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  induction_attended: boolean
  induction_attended_at: string | null
  is_active: boolean
  created_at: string
  profile_photo: string | null
  id_document?: string | null
  aadhaar_number?: string
  pan_number?: string
  profile_status?: string
  workflow_approval_status?: string
  training_status?: string
  access_level?: string
  attendance_status?: string
}

interface Stats {
  total: number
  pending_profile: number
  pending_approval: number
  approved_pending_induction: number
  active: number
  rejected: number
}

const BASE = '/api/auth/projectadmin'

const statusBadge = (status: string, approvalStatus: string) => {
  if (approvalStatus === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
  if (status === 'active') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
  if (status === 'approved_pending_induction') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pending Induction</span>
  if (status === 'pending_approval') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending Approval</span>
  if (status === 'pending_profile') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Profile Incomplete</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
}

const UserProfileModal: React.FC<{
  user: ManagedUser
  onClose: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onCorrections: (id: number) => void
  onMarkInduction: (id: number) => void
  loading: boolean
}> = ({ user, onClose, onApprove, onReject, onCorrections, onMarkInduction, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Profile Review</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
      </div>
      <div className="p-6 space-y-4">
        {/* Photo + basic */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
            {user.profile_photo
              ? <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-gray-400">{(user.name || user.username || '?')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user.name} {user.surname}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="mt-1">{statusBadge(user.status, user.approval_status)}</div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Employee ID', user.employee_id],
            ['Department', user.department],
            ['Designation', user.designation],
            ['Phone', user.phone_number],
            ['Emergency Contact', user.emergency_contact],
            ['Blood Group', user.blood_group],
            ['Company Type', user.company_type],
            ['Profile Submitted', user.profile_submitted_at ? new Date(user.profile_submitted_at).toLocaleDateString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="font-medium text-gray-900 dark:text-white">{value || '—'}</p>
            </div>
          ))}
        </div>

        {user.address && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <p className="text-gray-900 dark:text-white">{user.address}</p>
          </div>
        )}
        {user.safety_experience && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1">Safety Experience</p>
            <p className="text-gray-900 dark:text-white">{user.safety_experience}</p>
          </div>
        )}
        {user.skills && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1">Skills</p>
            <p className="text-gray-900 dark:text-white">{user.skills}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-sm">
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">Verification Status</p>
            <p className="font-medium text-blue-900 dark:text-blue-100">Profile: {user.profile_status || 'submitted'}</p>
            <p className="font-medium text-blue-900 dark:text-blue-100">Access: {user.access_level || 'verification_pending'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1">Documents</p>
            <p className="text-gray-900 dark:text-white">Aadhaar: {user.id_document ? 'Uploaded' : 'Missing'}</p>
            <p className="text-gray-900 dark:text-white">Photo: {user.profile_photo ? 'Uploaded' : 'Missing'}</p>
          </div>
        </div>
        {(!user.id_document || !user.aadhaar_number || !user.pan_number || !user.profile_photo) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Missing fields or document warnings</p>
            <p>{[
              !user.aadhaar_number && 'Aadhaar number',
              !user.pan_number && 'PAN number',
              !user.id_document && 'Aadhaar upload',
              !user.profile_photo && 'profile photo',
            ].filter(Boolean).join(', ') || 'None'}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-wrap">
        {user.approval_status === 'pending' && user.profile_completed && (
          <>
            <button
              onClick={() => onApprove(user.id)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <UserCheck className="w-4 h-4" /> Approve User
            </button>
            <button
              onClick={() => onReject(user.id)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <UserX className="w-4 h-4" /> Reject User
            </button>
            <button
              onClick={() => onCorrections(user.id)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <AlertTriangle className="w-4 h-4" /> Request Corrections
            </button>
          </>
        )}
        {user.status === 'approved_pending_induction' && (
          <button
            onClick={() => onMarkInduction(user.id)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Shield className="w-4 h-4" /> Mark Induction Attended
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>
)

const UserApprovalManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'induction' | 'active' | 'rejected'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiClient.get(`${BASE}/users/`),
        apiClient.get(`${BASE}/users/stats/`),
      ])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
      setStats(statsRes.data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async (userId: number) => {
    setActionLoading(true)
    try {
      await apiClient.post(`${BASE}/approvals/${userId}/approve/`, {})
      toast.success('User approved! Induction training required.')
      setSelectedUser(null)
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (userId: number) => {
    if (!confirm('Are you sure you want to reject this user?')) return
    setActionLoading(true)
    try {
      await apiClient.post(`${BASE}/approvals/${userId}/reject/`, {})
      toast.success('User rejected.')
      setSelectedUser(null)
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCorrections = async (userId: number) => {
    const reason = prompt('What should the user correct?') || ''
    if (!reason.trim()) return
    setActionLoading(true)
    try {
      await apiClient.post(`${BASE}/approvals/${userId}/corrections/`, { reason })
      toast.success('Correction request sent.')
      setSelectedUser(null)
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to request corrections')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkInduction = async (userId: number) => {
    if (!confirm('Mark induction attendance for this user? This will grant full platform access.')) return
    setActionLoading(true)
    try {
      await apiClient.post(`${BASE}/users/${userId}/mark-induction/`, {})
      toast.success('Induction marked! User now has full access.')
      setSelectedUser(null)
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to mark induction')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return u.approval_status === 'pending' && u.profile_completed
    if (filter === 'induction') return u.status === 'approved_pending_induction'
    if (filter === 'active') return u.status === 'active'
    if (filter === 'rejected') return u.approval_status === 'rejected'
    return true
  })

  const StatCard = ({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
    >
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className={`text-sm font-medium mt-0.5 ${color}`}>{label}</p>
    </button>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Approval Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review and approve user profiles, manage induction training</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Users" value={stats.total} color="text-gray-600" onClick={() => setFilter('all')} />
          <StatCard label="Profile Incomplete" value={stats.pending_profile} color="text-gray-500" />
          <StatCard label="Pending Approval" value={stats.pending_approval} color="text-amber-600" onClick={() => setFilter('pending')} />
          <StatCard label="Pending Induction" value={stats.approved_pending_induction} color="text-blue-600" onClick={() => setFilter('induction')} />
          <StatCard label="Active" value={stats.active} color="text-green-600" onClick={() => setFilter('active')} />
          <StatCard label="Rejected" value={stats.rejected} color="text-red-600" onClick={() => setFilter('rejected')} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Users' },
          { key: 'pending', label: '⏳ Pending Approval' },
          { key: 'induction', label: '📚 Pending Induction' },
          { key: 'active', label: '✅ Active' },
          { key: 'rejected', label: '❌ Rejected' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(u.name || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.name} {u.surname}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <p>{u.department || '—'}</p>
                      <p className="text-xs text-gray-500">{u.designation || ''}</p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(u.status, u.approval_status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.profile_submitted_at ? new Date(u.profile_submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {u.approval_status === 'pending' && u.profile_completed && (
                          <>
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Approve
                            </button>
            <button
              onClick={() => handleReject(u.id)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
              <UserX className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => handleCorrections(u.id)}
              disabled={actionLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Corrections
            </button>
                          </>
                        )}
                        {u.status === 'approved_pending_induction' && (
                          <button
                            onClick={() => handleMarkInduction(u.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Shield className="w-3.5 h-3.5" /> Mark Induction
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onCorrections={handleCorrections}
          onMarkInduction={handleMarkInduction}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

export default UserApprovalManagement
