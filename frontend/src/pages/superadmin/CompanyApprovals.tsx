import React, { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface PendingProfile {
  id: number
  company_name: string
  company_email: string
  phone: string
  address: string
  industry_type: string
  company_type: string
  contact_name: string
  designation: string
  approval_status: string
  created_at: string
}

const CompanyApprovalsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<PendingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadProfiles()
  }, [filter])

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/control-plane/company-profile/pending/', { params: { status: filter } })
      setProfiles(res.data)
    } catch {
      toast.error('Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await apiClient.post(`/api/control-plane/company-profile/${id}/approve/`)
      toast.success('Company approved')
      loadProfiles()
    } catch {
      toast.error('Approval failed')
    }
  }

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason (optional):')
    try {
      await apiClient.post(`/api/control-plane/company-profile/${id}/reject/`, { reason })
      toast.success('Company rejected')
      loadProfiles()
    } catch {
      toast.error('Rejection failed')
    }
  }

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (s === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Approvals</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No {filter} profiles found.</div>
      ) : (
        <div className="grid gap-4">
          {profiles.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{p.company_name}</h3>
                  <p className="text-sm text-gray-500">{p.company_email}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(p.approval_status)}`}>
                  {p.approval_status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-gray-500">Phone:</span> {p.phone}</div>
                <div><span className="text-gray-500">Industry:</span> {p.industry_type}</div>
                <div><span className="text-gray-500">Type:</span> {p.company_type}</div>
                <div><span className="text-gray-500">Contact:</span> {p.contact_name} ({p.designation})</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span className="font-medium">Address:</span> {p.address}
              </div>
              {p.approval_status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(p.id)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyApprovalsPage
