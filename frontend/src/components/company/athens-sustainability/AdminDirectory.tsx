import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, 
  Filter, 
  Edit, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  CheckCircle,
  Save,
  X,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { Label } from '../../ui/Label'
import { Select } from '../../ui/Select'
import { Modal } from '../../ui/Modal'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'

interface AdminDirectoryProps {
  onNavigateToTab?: (tab: string) => void
}

interface Admin {
  id: number
  user: {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
  }
  project: {
    id: number
    name: string
  }
  org_mapping?: {
    org_type: string
    org_name: string
  }
  role_type: string
  is_active: boolean
  invited_at: string
  activated_at?: string
}

interface Project {
  id: number
  name: string
}

interface ParentOrg {
  id: number
  org_name: string
}

const AdminDirectory: React.FC<AdminDirectoryProps> = () => {
  const queryClient = useQueryClient()
  
  // State
  const [filters, setFilters] = useState({
    project: '',
    role_type: '',
    status: '',
    org_type: ''
  })
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    role_type: '',
    is_active: true
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    username: '',
    project: '',
    role_type: '',
    org_type: '',
    parent_org: ''
  })

  // Queries
  const { data: adminData, isLoading } = useQuery({
    queryKey: ['athens-admin-directory', filters],
    queryFn: () => apiClient.get('/api/athens-sust/admin-directory/', { params: filters }),
    select: (response) => response.data
  })

  const { data: businessRules } = useQuery({
    queryKey: ['athens-admin-business-rules', filters.project],
    queryFn: () => apiClient.get('/api/athens-sust/admin-directory/business-rules/', { 
      params: { project: filters.project } 
    }),
    enabled: !!filters.project,
    select: (response) => response.data
  })

  const { data: parentOrgs } = useQuery({
    queryKey: ['athens-parent-orgs', createForm.project],
    queryFn: () => apiClient.get('/api/athens-sust/admin-users/parent-orgs/', {
      params: { project: createForm.project }
    }),
    enabled: !!createForm.project && createForm.org_type === 'CONTRACTOR',
    select: (response) => response.data
  })

  // Mutations
  const editAdminMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/api/athens-sust/admin-directory/${id}/edit/`, data),
    onSuccess: () => {
      toast.success('Admin updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-admin-directory'] })
      queryClient.invalidateQueries({ queryKey: ['athens-admin-business-rules'] })
      setShowEditModal(false)
      setEditingAdmin(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update admin')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post(`/api/athens-sust/admin-directory/${id}/toggle-status/`),
    onSuccess: () => {
      toast.success('Admin status updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-admin-directory'] })
      queryClient.invalidateQueries({ queryKey: ['athens-admin-business-rules'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update admin status')
    }
  })

  const createAdminMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/api/athens-sust/admin-users/invite/', data),
    onSuccess: () => {
      toast.success('Admin created successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-admin-directory'] })
      queryClient.invalidateQueries({ queryKey: ['athens-admin-business-rules'] })
      setShowCreateModal(false)
      setCreateForm({
        email: '',
        full_name: '',
        username: '',
        project: '',
        role_type: '',
        org_type: '',
        parent_org: ''
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create admin')
    }
  })

  const admins: Admin[] = adminData?.results || []
  const projects: Project[] = adminData?.projects || []

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setEditForm({
      role_type: admin.role_type,
      is_active: admin.is_active
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingAdmin) return
    
    editAdminMutation.mutate({
      id: editingAdmin.id,
      data: editForm
    })
  }

  const handleToggleStatus = (admin: Admin) => {
    if (window.confirm(
      `Are you sure you want to ${admin.is_active ? 'deactivate' : 'activate'} ${admin.user.email}?`
    )) {
      toggleStatusMutation.mutate(admin.id)
    }
  }

  const handleCreateAdmin = () => {
    const data: any = {
      email: createForm.email,
      full_name: createForm.full_name,
      username: createForm.username,
      project: parseInt(createForm.project),
      role_type: createForm.role_type,
      org_type: createForm.org_type
    }

    if (createForm.org_type === 'CONTRACTOR' && createForm.parent_org) {
      data.parent_org = parseInt(createForm.parent_org)
    }

    createAdminMutation.mutate(data)
  }

  const handleCreateFormChange = (key: string, value: string) => {
    setCreateForm(prev => {
      const updated = { ...prev, [key]: value }
      
      // Reset parent_org when org_type changes
      if (key === 'org_type' && value !== 'CONTRACTOR') {
        updated.parent_org = ''
      }
      
      // Set org_type based on role_type
      if (key === 'role_type') {
        if (value === 'CLIENT_ADMIN') updated.org_type = 'CLIENT'
        else if (value === 'EPC_ADMIN') updated.org_type = 'EPC'
        else if (value === 'CONTRACTOR_ADMIN') updated.org_type = 'CONTRACTOR'
      }
      
      return updated
    })
  }

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'CLIENT_ADMIN': 'Client Admin',
      'EPC_ADMIN': 'EPC Admin',
      'CONTRACTOR_ADMIN': 'Contractor Admin'
    }
    return roleMap[role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const colorMap: { [key: string]: string } = {
      'CLIENT_ADMIN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'EPC_ADMIN': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'CONTRACTOR_ADMIN': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    }
    return colorMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading admin directory..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Admin Directory
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage project administrators with role-based access control
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Admin
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="project-filter">Project</Label>
              <Select
                value={filters.project}
                onValueChange={(value) => handleFilterChange('project', value)}
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select
                value={filters.role_type}
                onValueChange={(value) => handleFilterChange('role_type', value)}
              >
                <option value="">All Roles</option>
                <option value="CLIENT_ADMIN">Client Admin</option>
                <option value="EPC_ADMIN">EPC Admin</option>
                <option value="CONTRACTOR_ADMIN">Contractor Admin</option>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="org-filter">Organization Type</Label>
              <Select
                value={filters.org_type}
                onValueChange={(value) => handleFilterChange('org_type', value)}
              >
                <option value="">All Organizations</option>
                <option value="CLIENT">Client</option>
                <option value="EPC">EPC</option>
                <option value="CONTRACTOR">Contractor</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Rules Summary */}
      {businessRules && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Business Rules - {businessRules.project_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Client Admin</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {businessRules.rules.client_admin.current_active} / {businessRules.rules.client_admin.max_active} active
                  </p>
                </div>
                {businessRules.rules.client_admin.can_create_new ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">EPC Admin</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {businessRules.rules.epc_admin.current_active} / {businessRules.rules.epc_admin.max_active} active
                  </p>
                </div>
                {businessRules.rules.epc_admin.can_create_new ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Contractor Admin</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {businessRules.rules.contractor_admin.current_active} active (unlimited)
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin List */}
      <Card>
        <CardHeader>
          <CardTitle>Administrators ({admins.length})</CardTitle>
          <CardDescription>
            Project administrators with their roles and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Administrators Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filters.project || filters.role_type || filters.status || filters.org_type
                  ? 'Try adjusting your filters to see more results.'
                  : 'No administrators have been created yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {admin.user.first_name?.charAt(0) || admin.user.username?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {admin.user.first_name && admin.user.last_name 
                                ? `${admin.user.first_name} ${admin.user.last_name}`
                                : admin.user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {admin.user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role_type)}`}>
                          {getRoleDisplayName(admin.role_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {admin.project.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditAdmin(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(admin)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {admin.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingAdmin(null)
        }}
        title="Edit Administrator"
        size="md"
      >
        {editingAdmin && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {editingAdmin.user.first_name && editingAdmin.user.last_name 
                  ? `${editingAdmin.user.first_name} ${editingAdmin.user.last_name}`
                  : editingAdmin.user.username}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {editingAdmin.user.email} • {editingAdmin.project.name}
              </p>
            </div>

            <div>
              <Label htmlFor="role_type">Role</Label>
              <Select
                value={editForm.role_type}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role_type: value }))}
              >
                <option value="CLIENT_ADMIN">Client Admin</option>
                <option value="EPC_ADMIN">EPC Admin</option>
                <option value="CONTRACTOR_ADMIN">Contractor Admin</option>
              </Select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingAdmin(null)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editAdminMutation.isPending}
              >
                {editAdminMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setCreateForm({
            email: '',
            full_name: '',
            username: '',
            project: '',
            role_type: '',
            org_type: '',
            parent_org: ''
          })
        }}
        title="Create Administrator"
        size="md"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <input
                type="email"
                id="email"
                value={createForm.email}
                onChange={(e) => handleCreateFormChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="admin@company.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <input
                type="text"
                id="full_name"
                value={createForm.full_name}
                onChange={(e) => handleCreateFormChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <input
                type="text"
                id="username"
                value={createForm.username}
                onChange={(e) => handleCreateFormChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Optional - will use email prefix if empty"
              />
            </div>
            
            <div>
              <Label htmlFor="project">Project *</Label>
              <Select
                value={createForm.project}
                onValueChange={(value) => handleCreateFormChange('project', value)}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="role_type">Role *</Label>
            <Select
              value={createForm.role_type}
              onValueChange={(value) => handleCreateFormChange('role_type', value)}
            >
              <option value="">Select Role</option>
              <option value="CLIENT_ADMIN">Client Admin</option>
              <option value="EPC_ADMIN">EPC Admin</option>
              <option value="CONTRACTOR_ADMIN">Contractor Admin</option>
            </Select>
          </div>

          {createForm.org_type === 'CONTRACTOR' && (
            <div>
              <Label htmlFor="parent_org">Parent EPC Organization *</Label>
              <Select
                value={createForm.parent_org}
                onValueChange={(value) => handleCreateFormChange('parent_org', value)}
              >
                <option value="">Select Parent EPC</option>
                {(parentOrgs || []).map((org: ParentOrg) => (
                  <option key={org.id} value={org.id.toString()}>
                    {org.org_name}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Contractor admins must be associated with an EPC organization
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setCreateForm({
                  email: '',
                  full_name: '',
                  username: '',
                  project: '',
                  role_type: '',
                  org_type: '',
                  parent_org: ''
                })
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending || !createForm.email || !createForm.full_name || !createForm.project || !createForm.role_type || (createForm.org_type === 'CONTRACTOR' && !createForm.parent_org)}
            >
              {createAdminMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admin
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminDirectory