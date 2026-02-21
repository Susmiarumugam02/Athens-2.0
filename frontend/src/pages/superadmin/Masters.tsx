import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Users, UserPlus, Eye, Edit, Trash2, Key, Power, PowerOff } from 'lucide-react'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface MasterAdmin {
  id: number
  email: string
  name: string
  surname: string
  is_active: boolean
  created_at: string
  tenant_name?: string
  athens_tenant_id?: number
}

interface Tenant {
  id: number
  name: string
  code: string
  is_active: boolean
}

const MastersPage: React.FC = () => {
  const [masters, setMasters] = useState<MasterAdmin[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState<MasterAdmin | null>(null)
  const [createForm, setCreateForm] = useState({ email: '', name: '', surname: '', tenant_id: '', password: '' })
  const [editForm, setEditForm] = useState({ email: '', name: '', surname: '', tenant_id: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mastersRes, tenantsRes] = await Promise.all([
        apiClient.get('/api/control-plane/masters/'),
        apiClient.get('/api/control-plane/tenants/')
      ])
      const mastersData = Array.isArray(mastersRes.data) ? mastersRes.data : []
      setMasters(mastersData)
      setTenants(tenantsRes.data)
    } catch (error: any) {
      toast.error('Failed to load data')
      setMasters([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.email || !createForm.name || !createForm.tenant_id || !createForm.password) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      await apiClient.post('/api/control-plane/masters/', createForm)
      toast.success('Master admin created successfully')
      setShowCreateModal(false)
      setCreateForm({ email: '', name: '', surname: '', tenant_id: '', password: '' })
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create master admin')
    }
  }

  const handleUpdate = async () => {
    if (!selectedMaster) return
    try {
      const updateData: any = {
        name: editForm.name,
        surname: editForm.surname
      }
      if (editForm.tenant_id) {
        updateData.athens_tenant_id = parseInt(editForm.tenant_id)
      }
      await apiClient.patch(`/api/control-plane/masters/${selectedMaster.id}/`, updateData)
      toast.success('Master admin updated')
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update')
    }
  }

  const handleDelete = async () => {
    if (!selectedMaster) return
    try {
      await apiClient.delete(`/api/control-plane/masters/${selectedMaster.id}/`)
      toast.success('Master admin deleted')
      setShowDeleteModal(false)
      setSelectedMaster(null)
      loadData()
    } catch (error: any) {
      toast.error('Failed to delete')
    }
  }

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Send password reset email to this user?')) return
    try {
      await apiClient.post(`/api/auth/users/${userId}/reset-password/`)
      toast.success('Password reset email sent')
    } catch (error: any) {
      toast.error('Failed to reset password')
    }
  }

  const handleToggleStatus = async (userId: number) => {
    try {
      await apiClient.post(`/api/auth/users/${userId}/toggle-status/`)
      toast.success('User status updated')
      loadData()
    } catch (error: any) {
      toast.error('Failed to update status')
    }
  }

  const handleView = (master: MasterAdmin) => {
    setSelectedMaster(master)
    setShowViewModal(true)
  }

  const handleEdit = (master: MasterAdmin) => {
    setSelectedMaster(master)
    setEditForm({ 
      email: master.email,
      name: master.name, 
      surname: master.surname,
      tenant_id: master.athens_tenant_id?.toString() || ''
    })
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Admins</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage tenant administrators</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create Master Admin
        </Button>
      </div>

      {masters.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No master admins found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first master admin.</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create Master Admin
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {masters.map((master) => (
                  <tr key={master.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{master.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {master.name} {master.surname}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {master.tenant_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={master.is_active ? 'success' : 'secondary'}>
                        {master.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(master.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleView(master)} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" title="View">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleEdit(master)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Edit">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleResetPassword(master.id)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300" title="Reset Password">
                          <Key className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleToggleStatus(master.id)} className={master.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'} title={master.is_active ? 'Disable' : 'Enable'}>
                          {master.is_active ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                        </button>
                        <button onClick={() => { setSelectedMaster(master); setShowDeleteModal(true) }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Master Admin">
        <div className="space-y-4">
          <Input placeholder="Email *" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <Input placeholder="Name *" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <Input placeholder="Surname" value={createForm.surname} onChange={(e) => setCreateForm({ ...createForm, surname: e.target.value })} />
          <Input placeholder="Password *" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant *</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={createForm.tenant_id} onChange={(e) => setCreateForm({ ...createForm, tenant_id: e.target.value })}>
              <option value="">Select tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="View Master Admin">
        {selectedMaster && (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Email</label><Input value={selectedMaster.email} readOnly /></div>
            <div><label className="block text-sm font-medium mb-1">Name</label><Input value={`${selectedMaster.name} ${selectedMaster.surname}`} readOnly /></div>
            <div><label className="block text-sm font-medium mb-1">Tenant</label><Input value={selectedMaster.tenant_name || '-'} readOnly /></div>
            <div><label className="block text-sm font-medium mb-1">Status</label><Input value={selectedMaster.is_active ? 'Active' : 'Inactive'} readOnly /></div>
            <div className="flex justify-end pt-4"><Button onClick={() => setShowViewModal(false)}>Close</Button></div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Master Admin">
        <div className="space-y-4">
          <Input placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled />
          <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input placeholder="Surname" value={editForm.surname} onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={editForm.tenant_id} onChange={(e) => setEditForm({ ...editForm, tenant_id: e.target.value })}>
              <option value="">Select tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Master Admin">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{selectedMaster?.email}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default MastersPage
