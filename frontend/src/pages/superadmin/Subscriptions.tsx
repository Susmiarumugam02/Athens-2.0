import React, { useEffect, useState } from 'react'
import SuperadminLayout from '../../layouts/SuperadminLayout'
import { controlPlaneService, type Subscription, type Tenant } from '../../services/controlPlaneService'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    tenant: '',
    plan_name: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [subsRes, tenantsRes] = await Promise.all([
        controlPlaneService.getSubscriptions(),
        controlPlaneService.getTenants(),
      ])
      setSubscriptions(subsRes.data)
      setTenants(tenantsRes.data.filter(t => t.is_active))
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.tenant || !formData.plan_name || !formData.start_date) {
      toast.error('Please fill required fields')
      return
    }

    try {
      await controlPlaneService.createSubscription({
        tenant: parseInt(formData.tenant),
        plan_name: formData.plan_name,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
      })
      toast.success('Subscription created successfully')
      setShowModal(false)
      setFormData({
        tenant: '',
        plan_name: '',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      })
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create subscription')
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
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage tenant subscriptions</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Subscription
          </Button>
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
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {sub.tenant_name || `Tenant #${sub.tenant}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{sub.plan_name}</td>
                      <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sub.start_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}
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
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Subscription">
        <div className="space-y-4">
          <Select
            label="Tenant"
            value={formData.tenant}
            onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
          >
            <option value="">Select tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </Select>
          <Input
            label="Plan Name"
            value={formData.plan_name}
            onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
            placeholder="Enterprise, Pro, etc."
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
          <Input
            label="End Date (Optional)"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>
    </SuperadminLayout>
  )
}

export default SubscriptionsPage
