import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { controlPlaneService, type Subscription } from '../../services/controlPlaneService'
import { apiClient } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Eye, Settings, FileText, Edit, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { ViewSubscriptionModal } from '../../components/modals/ViewSubscriptionModal'
import { EditSubscriptionModal } from '../../components/modals/EditSubscriptionModal'

const SubscriptionsPage: React.FC = () => {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [serviceStats, setServiceStats] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [viewSubscription, setViewSubscription] = useState<Subscription | null>(null)
  const [editSubscription, setEditSubscription] = useState<Subscription | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await controlPlaneService.getSubscriptions()
      setSubscriptions(res.data)

      const stats = new Map<number, number>()
      await Promise.all(
        res.data.map(async (sub) => {
          try {
            const tsRes = await apiClient.get(`/api/system/tenant-services/?tenant_id=${sub.tenant}`)
            const enabledCount = tsRes.data.filter((ts: any) => ts.is_enabled).length
            stats.set(sub.tenant, enabledCount)
          } catch {
            stats.set(sub.tenant, 0)
          }
        })
      )
      setServiceStats(stats)
    } catch {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSubscription = async (id: number, data: Partial<Subscription>) => {
    try {
      await apiClient.patch(`/api/control-plane/subscriptions/${id}/`, data)
      toast.success('Subscription updated successfully')
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update subscription')
      throw error
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const getStatusBadge = (sub: Subscription) => {
    const ds = sub.display_status || sub.status

    if (ds === 'none' || sub.status === 'none') {
      return <Badge variant="secondary">No Subscription</Badge>
    }
    if (ds === 'expired' || sub.status === 'cancelled') {
      return <Badge variant="secondary">Expired</Badge>
    }
    if (ds === 'not_started') {
      return <Badge variant="warning">Not Started</Badge>
    }
    if (ds === 'active' || sub.status === 'active') {
      return <Badge variant="success">Active</Badge>
    }
    if (sub.status === 'trial') {
      return <Badge variant="warning">Trial</Badge>
    }
    if (sub.status === 'past_due') {
      return <Badge variant="warning">Past Due</Badge>
    }
    return <Badge variant="secondary">{sub.status}</Badge>
  }

  // ── Remaining days cell ───────────────────────────────────────────────────
  const getRemainingDaysCell = (sub: Subscription) => {
    if (sub.remaining_days === null || sub.remaining_days === undefined) {
      if (!sub.valid_until) return <span className="text-gray-400 dark:text-gray-500">—</span>
      return <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
    }
    if (sub.remaining_days === 0) {
      return <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
    }
    const color =
      sub.remaining_days <= 3  ? 'text-red-600 dark:text-red-400' :
      sub.remaining_days <= 14 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-green-600 dark:text-green-400'
    return (
      <span className={`font-medium flex items-center gap-1 ${color}`}>
        <Clock className="w-3.5 h-3.5" />
        {sub.remaining_days}d left
      </span>
    )
  }

  // ── Summary counts ────────────────────────────────────────────────────────
  const activeCount  = subscriptions.filter(s => s.display_status === 'active').length
  const expiredCount = subscriptions.filter(s => s.display_status === 'expired').length
  const noneCount    = subscriptions.filter(s => s.status === 'none').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage tenant subscriptions and plans</p>
          </div>
        </div>
        <Button onClick={() => navigate('/superadmin/services')} variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Manage Services
        </Button>
      </div>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Tenant</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Services</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Start Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">End Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Remaining</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No tenants found
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub, idx) => {
                  const serviceCount = serviceStats.get(sub.tenant) || 0
                  const rowKey = sub.id ?? `no-sub-${sub.tenant}-${idx}`
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {/* Tenant */}
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {sub.tenant_name || `Tenant #${sub.tenant}`}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.plan_name || '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(sub)}</td>

                      {/* Services */}
                      <td className="py-3 px-4">
                        <Badge variant={serviceCount > 0 ? 'success' : 'secondary'} className="text-xs">
                          {serviceCount} enabled
                        </Badge>
                      </td>

                      {/* Start Date */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.valid_from ? new Date(sub.valid_from).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      {/* End Date */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.valid_until ? new Date(sub.valid_until).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      {/* Remaining Days */}
                      <td className="py-3 px-4 text-sm">
                        {getRemainingDaysCell(sub)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate('/superadmin/services')}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Manage services"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {sub.id && (
                            <>
                              <button
                                onClick={() => setEditSubscription(sub)}
                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Edit subscription"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setViewSubscription(sub)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Tenants</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{subscriptions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
          <div className="text-2xl font-bold text-red-500 mt-1">{expiredCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">No Subscription</div>
          <div className="text-2xl font-bold text-gray-400 mt-1">{noneCount}</div>
        </Card>
      </div>

      {/* Modals */}
      <ViewSubscriptionModal
        open={!!viewSubscription}
        onOpenChange={(open) => !open && setViewSubscription(null)}
        subscription={viewSubscription}
      />
      <EditSubscriptionModal
        open={!!editSubscription}
        onOpenChange={(open) => !open && setEditSubscription(null)}
        subscription={editSubscription}
        onSave={handleUpdateSubscription}
      />
    </div>
  )
}

export default SubscriptionsPage
