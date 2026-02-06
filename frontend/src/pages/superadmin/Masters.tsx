import React, { useEffect, useState } from 'react'
import SuperadminLayout from '../../../layouts/SuperadminLayout'
import { controlPlaneService, MasterAdmin, Tenant } from '../../../services/controlPlaneService'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Badge } from '../../../components/ui/Badge'
import { Plus, PowerOff, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

const MastersPage: React.FC = () => {
  const [masters, setMasters] = useState<MasterAdmin[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', tenant: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mastersRes, tenantsRes] = await Promise.all([
        controlPlaneService.getMasters(),
        controlPlaneService.getTenants(),
      ])
      setMasters(mastersRes.data)
      setTenants(tenantsRes.data.filter(t => t.is_active))
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.tenant) {
      toast.error('Please fill all fields')
      return
    }

    try {
      await controlPlaneService.createMaster({
        email: formData.email,
        password: formData.password,
        tenant: parseInt(formData.tenant),
      })
      toast.success('Master admin created successfully')
      setShowModal(false)
      setFormData({ email: '', password: '', tenant: '' })
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create master admin')
    }
  }

  const handleDisable = async (master: MasterAdmin) => {
    if (!confirm('Are you sure you want to disable this master admin?')) return

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
      toast.success(`Password reset. New password: ${res.data.new_password}`, { duration: 10000 })
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Admins</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage tenant administrators</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
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
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{master.user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {master.tenant_name || `Tenant #${master.tenant}`}
                      </td>
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
                          <Button size="sm" variant="outline" onClick={() => handleResetPassword(master)}>
                            <KeyRound className="w-4 h-4 mr-1" />
                            Reset Password
                          </Button>
                          {master.is_active && (
                            <Button size="sm" variant="outline" onClick={() => handleDisable(master)}>
                              <PowerOff className="w-4 h-4 mr-1" />
                              Disable
                            </Button>
                          )}
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
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Master Admin">
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="admin@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
          />
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
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>
    </SuperadminLayout>
  )
}

export default MastersPage
