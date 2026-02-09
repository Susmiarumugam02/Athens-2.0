import React, { useEffect, useState } from 'react'
import { controlPlaneService, type MasterAdmin, type Tenant } from '../../services/controlPlaneService'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Plus, Eye, Edit, Trash2, PowerOff, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { CreateMasterAdminModal } from '../../components/modals/CreateMasterAdminModal'
import { ViewMasterAdminModal } from '../../components/modals/ViewMasterAdminModal'
import { EditMasterAdminModal } from '../../components/modals/EditMasterAdminModal'
import { DeleteMasterAdminModal } from '../../components/modals/DeleteMasterAdminModal'

const MastersPage: React.FC = () => {
  const [masters, setMasters] = useState<MasterAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewMaster, setViewMaster] = useState<MasterAdmin | null>(null)
  const [editMaster, setEditMaster] = useState<MasterAdmin | null>(null)
  const [deleteMaster, setDeleteMaster] = useState<MasterAdmin | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await controlPlaneService.getMasters()
      setMasters(res.data)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (master: MasterAdmin) => {
    if (!confirm('Disable this master admin?')) return
    try {
      await controlPlaneService.disableMaster(master.id)
      toast.success('Master admin disabled')
      loadData()
    } catch (error) {
      toast.error('Failed to disable master admin')
    }
  }

  const handleResetPassword = async (master: MasterAdmin) => {
    if (!confirm('Reset password for this master admin?')) return
    try {
      const res = await controlPlaneService.resetMasterPassword(master.id)
      toast.success(`Password reset! New password: ${res.data.new_password}`, { duration: 10000 })
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Admins</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage tenant administrators</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Master Admin
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {masters.map((master) => (
                  <tr key={master.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{master.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{master.tenant_name || `Tenant #${master.tenant}`}</td>
                    <td className="py-3 px-4">
                      <Badge variant={master.is_active ? 'success' : 'secondary'}>
                        {master.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(master.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewMaster(master)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditMaster(master)} className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Edit master admin">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleResetPassword(master)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Reset password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {master.is_active && (
                          <button onClick={() => handleDisable(master)} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Disable">
                            <PowerOff className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteMaster(master)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete master admin">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {masters.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No master admins found</p>
            )}
          </div>
        )}
      </Card>

      <CreateMasterAdminModal open={showCreate} onOpenChange={setShowCreate} onSuccess={loadData} />
      <ViewMasterAdminModal open={!!viewMaster} onOpenChange={(open) => !open && setViewMaster(null)} master={viewMaster} />
      <EditMasterAdminModal open={!!editMaster} onOpenChange={(open) => !open && setEditMaster(null)} master={editMaster} onSuccess={loadData} />
      <DeleteMasterAdminModal open={!!deleteMaster} onOpenChange={(open) => !open && setDeleteMaster(null)} master={deleteMaster} onSuccess={loadData} />
    </div>
  )
}

export default MastersPage
