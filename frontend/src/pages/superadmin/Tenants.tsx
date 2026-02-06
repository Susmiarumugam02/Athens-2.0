import React, { useEffect, useState } from 'react'
import SuperadminLayout from '../../../layouts/SuperadminLayout'
import { controlPlaneService, Tenant } from '../../../services/controlPlaneService'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Plus, Power, PowerOff } from 'lucide-react'
import toast from 'react-hot-toast'

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', domain: '' })

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const res = await controlPlaneService.getTenants()
      setTenants(res.data)
    } catch (error) {
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.domain) {
      toast.error('Please fill all fields')
      return
    }

    try {
      await controlPlaneService.createTenant(formData)
      toast.success('Tenant created successfully')
      setShowModal(false)
      setFormData({ name: '', domain: '' })
      loadTenants()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create tenant')
    }
  }

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      if (tenant.is_active) {
        await controlPlaneService.disableTenant(tenant.id)
        toast.success('Tenant disabled')
      } else {
        await controlPlaneService.enableTenant(tenant.id)
        toast.success('Tenant enabled')
      }
      loadTenants()
    } catch (error) {
      toast.error('Failed to update tenant status')
    }
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage platform tenants</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Tenant
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Domain</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{tenant.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{tenant.domain}</td>
                      <td className="py-3 px-4">
                        <Badge variant={tenant.is_active ? 'success' : 'secondary'}>
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant={tenant.is_active ? 'outline' : 'default'}
                          onClick={() => handleToggleStatus(tenant)}
                        >
                          {tenant.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tenants.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No tenants found</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Tenant">
        <div className="space-y-4">
          <Input
            label="Tenant Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter tenant name"
          />
          <Input
            label="Domain"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="example.com"
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

export default TenantsPage
