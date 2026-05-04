import React, { useEffect, useState } from 'react'
import { controlPlaneService, type Tenant } from '../../services/controlPlaneService'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Plus, Eye, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { CreateTenantModal } from '../../components/modals/CreateTenantModal'
import { ViewTenantModal } from '../../components/modals/ViewTenantModal'
import { EditTenantModal } from '../../components/modals/EditTenantModal'
import { DeleteTenantModal } from '../../components/modals/DeleteTenantModal'

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage platform tenants</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{tenant.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{tenant.code}</td>
                    <td className="py-3 px-4">
                      <Badge variant={tenant.is_active ? 'success' : 'secondary'}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewTenant(tenant)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditTenant(tenant)} className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Edit tenant">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(tenant)} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title={tenant.is_active ? 'Disable' : 'Enable'}>
                          {tenant.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setDeleteTenant(tenant)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete tenant">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      <CreateTenantModal open={showCreate} onOpenChange={setShowCreate} onSuccess={loadTenants} />
      <ViewTenantModal open={!!viewTenant} onOpenChange={(open) => !open && setViewTenant(null)} tenant={viewTenant} />
      <EditTenantModal open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)} tenant={editTenant} onSuccess={loadTenants} />
      <DeleteTenantModal open={!!deleteTenant} onOpenChange={(open) => !open && setDeleteTenant(null)} tenant={deleteTenant} onSuccess={loadTenants} />
    </div>
  )
}

export default TenantsPage
