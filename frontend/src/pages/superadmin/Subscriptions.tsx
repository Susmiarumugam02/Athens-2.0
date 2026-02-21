import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { controlPlaneService, type Subscription } from '../../services/controlPlaneService'
import { apiClient } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Eye, Settings, FileText, Edit } from 'lucide-react'
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

  useEffect(() => {
    loadData()
  }, [])

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
          } catch (e) {
            stats.set(sub.tenant, 0)
          }
        })
      )
      setServiceStats(stats)
    } catch (error) {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'secondary'> = {
      active: 'success',
      trial: 'warning',
      past_due: 'warning',
      cancelled: 'secondary',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
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

      {/* Subscriptions Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Tenant</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Services</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Valid From</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Valid Until</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const serviceCount = serviceStats.get(sub.tenant) || 0
                return (
                  <tr key={sub.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {sub.tenant_name || `Tenant #${sub.tenant}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{sub.plan_name}</div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={serviceCount > 0 ? 'success' : 'secondary'} className="text-xs">
                        {serviceCount} enabled
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sub.valid_from).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {sub.valid_until ? new Date(sub.valid_until).toLocaleDateString() : 'Unlimited'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate('/superadmin/services')}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Manage services"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {subscriptions.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No subscriptions found</p>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Subscriptions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{subscriptions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Subscriptions</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {subscriptions.filter(s => s.status === 'active').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Services Enabled</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {Array.from(serviceStats.values()).reduce((sum, count) => sum + count, 0)}
          </div>
        </Card>
      </div>

      {/* View Modal */}
      <ViewSubscriptionModal 
        open={!!viewSubscription} 
        onOpenChange={(open) => !open && setViewSubscription(null)} 
        subscription={viewSubscription} 
      />

      {/* Edit Modal */}
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
