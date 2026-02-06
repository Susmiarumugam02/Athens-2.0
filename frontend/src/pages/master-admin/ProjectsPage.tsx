import React, { useEffect, useState } from 'react'
import MasterAdminLayout from '../../layouts/MasterAdminLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { projectsService, type Project, type ProjectMember } from '../../services/projectsService'
import { usersService, type User } from '../../services/usersService'
import { Plus, Edit, Archive, Power, Users, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  
  useEffect(() => {
    loadProjects()
  }, [statusFilter, searchQuery])
  
  const loadProjects = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const data = await projectsService.listProjects(params)
      setProjects(data)
    } catch (error: any) {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }
  
  const handleStatusChange = async (project: Project, newStatus: string) => {
    try {
      if (newStatus === 'active') {
        await projectsService.activateProject(project.id)
      } else if (newStatus === 'inactive') {
        await projectsService.deactivateProject(project.id)
      } else if (newStatus === 'archived') {
        await projectsService.archiveProject(project.id)
      }
      toast.success(`Project ${newStatus}`)
      loadProjects()
    } catch (error: any) {
      toast.error('Failed to update project status')
    }
  }
  
  const getStatusBadge = (status: string) => {
    const classes = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'bg-muted text-muted-foreground',
      archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status as keyof typeof classes]}`}>
        {status}
      </span>
    )
  }
  
  if (loading) {
    return (
      <MasterAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </MasterAdminLayout>
    )
  }
  
  return (
    <MasterAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your company projects</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
        
        {/* Filters */}
        <Card className="rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </Card>
        
        {/* Projects Table */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{project.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{project.code}</td>
                      <td className="px-6 py-4 text-sm">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{project.members_count}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(project)
                              setShowEditModal(true)
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project)
                              setShowMembersModal(true)
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Manage Members"
                          >
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {project.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(project, 'inactive')}
                              className="p-1 hover:bg-muted rounded"
                              title="Deactivate"
                            >
                              <Power className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                          {project.status === 'inactive' && (
                            <button
                              onClick={() => handleStatusChange(project, 'active')}
                              className="p-1 hover:bg-muted rounded"
                              title="Activate"
                            >
                              <Power className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {project.status !== 'archived' && (
                            <button
                              onClick={() => handleStatusChange(project, 'archived')}
                              className="p-1 hover:bg-muted rounded"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} onSuccess={loadProjects} />}
      {showEditModal && selectedProject && (
        <EditProjectModal project={selectedProject} onClose={() => setShowEditModal(false)} onSuccess={loadProjects} />
      )}
      {showMembersModal && selectedProject && (
        <MembersModal project={selectedProject} onClose={() => setShowMembersModal(false)} />
      )}
    </MasterAdminLayout>
  )
}

// Create Project Modal
const CreateProjectModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active',
    start_date: '',
    end_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await projectsService.createProject({
        name: formData.name,
        code: formData.code || undefined,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      })
      toast.success('Project created successfully')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Create Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Code (optional)</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Auto-generated if empty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Edit Project Modal
const EditProjectModal: React.FC<{ project: Project; onClose: () => void; onSuccess: () => void }> = ({ project, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: project.name,
    status: project.status as 'active' | 'inactive' | 'archived',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
  })
  const [submitting, setSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await projectsService.updateProject(project.id, {
        name: formData.name,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      })
      toast.success('Project updated successfully')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error('Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Edit Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'archived' })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Members Modal
const MembersModal: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('member')
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const [membersData, usersData] = await Promise.all([
        projectsService.listMembers(project.id),
        usersService.listUsers({ company: 'me' })
      ])
      setMembers(membersData)
      setUsers(usersData)
    } catch (error: any) {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddMember = async () => {
    if (!selectedUserId) return
    
    try {
      await projectsService.addMember(project.id, {
        user_id: parseInt(selectedUserId),
        role: selectedRole
      })
      toast.success('Member added successfully')
      setShowAddForm(false)
      setSelectedUserId('')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member')
    }
  }
  
  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Remove this member?')) return
    
    try {
      await projectsService.removeMember(memberId)
      toast.success('Member removed')
      loadData()
    } catch (error: any) {
      toast.error('Failed to remove member')
    }
  }
  
  const availableUsers = users.filter(u => !members.some(m => m.user === u.id && m.is_active))
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Manage Members - {project.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {!showAddForm ? (
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            ) : (
              <div className="p-4 border border-border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select User</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.email}</option>
                    ))}
                  </select>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddMember} size="sm" disabled={!selectedUserId}>Add</Button>
                  <Button onClick={() => setShowAddForm(false)} variant="secondary" size="sm">Cancel</Button>
                </div>
              </div>
            )}
            
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No members yet</td>
                    </tr>
                  ) : (
                    members.map(member => (
                      <tr key={member.id}>
                        <td className="px-4 py-2 text-sm text-foreground">{member.user_email}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground capitalize">{member.role}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive hover:underline text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ProjectsPage
