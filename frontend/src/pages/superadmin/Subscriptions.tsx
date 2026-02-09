import React, { useEffect, useState } from 'react'
import { controlPlaneService, type Subscription } from '../../services/controlPlaneService'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { ViewSubscriptionModal } from '../../components/modals/ViewSubscriptionModal'

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [viewSubscription, setViewSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await controlPlaneService.getSubscriptions()
      setSubscriptions(res.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'secondary'> = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'warning',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage tenant subscriptions</p>
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Start Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">End Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{sub.tenant_name || `Tenant #${sub.tenant}`}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{sub.plan_name}</td>
                    <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{new Date(sub.start_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => setViewSubscription(sub)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No subscriptions found</p>
            )}
          </div>
        )}
      </Card>

      <ViewSubscriptionModal open={!!viewSubscription} onOpenChange={(open) => !open && setViewSubscription(null)} subscription={viewSubscription} />
    </div>
  )
}

export default SubscriptionsPage
