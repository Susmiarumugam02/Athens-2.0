import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { masterAdminService } from '../../services/masteradmin'
import type { Project, AdminUser, ProjectAdminCreateResponse } from '../../services/masteradmin'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const AdminUsers: React.FC = () => {
  const { user, hydrated } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentials, setCredentials] = useState<ProjectAdminCreateResponse | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ username: '', company_name: '', registered_address: '' })
  const [createForm, setCreateForm] = useState({
    project_id: '',
    admin_type: '',
    username: '',
    company_name: '',
    registered_address: '',
  })
  const [projectAdmins, setProjectAdmins] = useState<{[key: number]: {client: boolean, epc: number, subscriber_role?: string}}>({})  

  useEffect(() => {
    if (hydrated && user) {
      loadData()
    }
  }, [hydrated, user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, projectsData] = await Promise.all([
        masterAdminService.getAdminUsers(),
        masterAdminService.getProjects()
      ])
      setUsers(usersData)
      setProjects(projectsData)
      
      // Build map of existing admins per project + subscriber_role
      const adminMap: {[key: number]: {client: boolean, epc: number, subscriber_role?: string}} = {}
      projectsData.forEach(p => {
        adminMap[p.id] = {client: false, epc: 0, subscriber_role: p.subscriber_role}
      })
      usersData.forEach(u => {
        if (u.project && u.admin_type && adminMap[u.project]) {
          if (u.admin_type === 'client') adminMap[u.project].client = true
          if (u.admin_type === 'epc') adminMap[u.project].epc++
        }
      })
      setProjectAdmins(adminMap)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!createForm.project_id || !createForm.admin_type || !createForm.username ||
        !createForm.company_name || !createForm.registered_address) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const result = await masterAdminService.createProjectAdmin({
        project_id: parseInt(createForm.project_id),
        admin_type: createForm.admin_type as 'client' | 'epc' | 'contractor',
        username: createForm.username,
        company_name: createForm.company_name,
        registered_address: createForm.registered_address,
      })
      
      toast.success('Admin user created successfully')
      setShowCreateModal(false)
      setCredentials(result)
      setShowCredentialsModal(true)
      
      // Download credentials automatically
      downloadCredentials(result)
      
      setCreateForm({
        project_id: '',
        admin_type: '',
        username: '',
        company_name: '',
        registered_address: '',
      })
      loadData()
    } catch (err: any) {
      const errorMsg = err.response?.data?.username?.[0] || 
                       err.response?.data?.project_id?.[0] ||
                       err.response?.data?.error ||
                       err.message || 
                       'Failed to create admin user'
      toast.error(errorMsg)
    }
  }

  const downloadCredentials = (data: ProjectAdminCreateResponse) => {
    const content = `Admin Type: ${data.admin_type.toUpperCase()}
Username: ${data.username}
Password: ${data.password}
Company Name: ${data.company_name}
Registered Address: ${data.registered_address}

IMPORTANT: Password shown only once. User must change on first login.
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.admin_type}_admin_credentials_${data.username}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return
    
    try {
      await masterAdminService.resetAdminPassword(userId)
      toast.success('Password reset email sent successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    }
  }

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'disable' : 'enable'
    if (!confirm(`Are you sure you want to ${action} this user?`)) return
    try {
      await masterAdminService.toggleAdminActive(userId, !currentStatus)
      toast.success(`User ${action}d successfully`)
      loadData()
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} user`)
    }
  }

  const handleView = (u: AdminUser) => { setSelectedUser(u); setShowViewModal(true) }
  const handleEdit = (u: AdminUser) => { setSelectedUser(u); setEditForm({ username: u.username, company_name: u.company_name || '', registered_address: u.registered_address || '' }); setShowEditModal(true) }
  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      await masterAdminService.deleteAdminUser(selectedUser.id)
      toast.success('User deleted successfully')
      setShowDeleteModal(false)
      setSelectedUser(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
    }
  }
  const handleUpdate = async () => { if (!selectedUser) return; try { toast.success('User updated'); setShowEditModal(false); loadData() } catch (err: any) { toast.error(err.message || 'Failed to update') } }

  const getAdminTypeBadge = (type?: string) => {
    if (!type) return null
    const colors = {
      client: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      epc: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      contractor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type as keyof typeof colors]}`}>
        {type.toUpperCase()}
      </span>
    )
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Users
        </h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Admin User
        </Button>
      </div>

      {users.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No admin users found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first admin user.</p>
          <Button onClick={() => setShowCreateModal(true)}>Create Admin User</Button>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admin Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAdminTypeBadge(user.admin_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.project_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleView(user)} className="relative text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" data-tooltip="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleEdit(user)} className="relative text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" data-tooltip="Edit User">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleResetPassword(user.id)} className="relative text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300" data-tooltip="Reset Password">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </button>
                        <button onClick={() => handleToggleStatus(user.id, user.is_active)} className={`relative ${user.is_active ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'}`} data-tooltip={user.is_active ? 'Disable User' : 'Enable User'}>
                          {user.is_active ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowDeleteModal(true) }} className="relative text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" data-tooltip="Delete User">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      {/* Create Admin User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Project Admin">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={createForm.project_id}
              onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Type *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={createForm.admin_type}
              onChange={(e) => setCreateForm({ ...createForm, admin_type: e.target.value })}
            >
              <option value="">Select admin type</option>
              <option 
                value="client" 
                disabled={createForm.project_id && projectAdmins[parseInt(createForm.project_id)]?.client}
              >
                Client Admin {createForm.project_id && projectAdmins[parseInt(createForm.project_id)]?.client ? '(Already assigned)' : ''}
              </option>
              <option 
                value="epc"
                disabled={createForm.project_id && projectAdmins[parseInt(createForm.project_id)]?.subscriber_role === 'epc' && projectAdmins[parseInt(createForm.project_id)]?.epc >= 1}
              >
                EPC Admin {createForm.project_id && projectAdmins[parseInt(createForm.project_id)]?.subscriber_role === 'epc' && projectAdmins[parseInt(createForm.project_id)]?.epc >= 1 ? '(Max 1 for EPC subscriber)' : ''}
              </option>
              <option value="contractor">Contractor Admin</option>
            </select>
          </div>

          <Input
            placeholder="Username *"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
          />

          <Input
            placeholder="Company Name *"
            value={createForm.company_name}
            onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Registered Office Address *
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter registered office address"
              value={createForm.registered_address}
              onChange={(e) => setCreateForm({ ...createForm, registered_address: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin}>
              Create Admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal 
        isOpen={showCredentialsModal} 
        onClose={() => {
          setShowCredentialsModal(false)
          setCredentials(null) // Clear credentials from memory
        }} 
        title="Admin User Created"
      >
        {credentials && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Important</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Password is shown only once. Credentials have been downloaded automatically. User must change password on first login.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <div className="flex gap-2">
                  <Input value={credentials.username} readOnly />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(credentials.username, 'Username')}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="flex gap-2">
                  <Input value={credentials.password} readOnly type="text" className="font-mono" />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(credentials.password, 'Password')}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admin Type
                </label>
                <Input value={credentials.admin_type.toUpperCase()} readOnly />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name
                </label>
                <Input value={credentials.company_name} readOnly />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => {
                setShowCredentialsModal(false)
                setCredentials(null)
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="View Admin User">
        {selectedUser && <div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Username</label><Input value={selectedUser.username} readOnly /></div><div><label className="block text-sm font-medium mb-1">Admin Type</label><Input value={selectedUser.admin_type?.toUpperCase() || '-'} readOnly /></div><div><label className="block text-sm font-medium mb-1">Company</label><Input value={selectedUser.company_name || '-'} readOnly /></div><div><label className="block text-sm font-medium mb-1">Project</label><Input value={selectedUser.project_name || '-'} readOnly /></div><div><label className="block text-sm font-medium mb-1">Status</label><Input value={selectedUser.is_active ? 'Active' : 'Inactive'} readOnly /></div><div className="flex justify-end pt-4"><Button onClick={() => setShowViewModal(false)}>Close</Button></div></div>}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Admin User">
        <div className="space-y-4"><Input placeholder="Username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /><Input placeholder="Company Name" value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} /><div><label className="block text-sm font-medium mb-1">Registered Address</label><textarea className="w-full px-3 py-2 border rounded-lg" rows={3} value={editForm.registered_address} onChange={(e) => setEditForm({ ...editForm, registered_address: e.target.value })} /></div><div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button><Button onClick={handleUpdate}>Update</Button></div></div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{selectedUser?.username}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminUsers
