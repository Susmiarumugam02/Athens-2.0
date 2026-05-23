import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FolderKanban,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { masterAdminService } from '../../services/masteradmin'
import type {
  AdminUser,
  AdminCreatedUsersResponse,
  CreatedUser,
  ProjectAdminCreateResponse,
  ProjectWithAnalytics,
} from '../../services/masteradmin'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

type AdminGroups = Record<string, AdminUser[]>
type ViewMode = 'projects' | 'hierarchy' | 'users'

type ExtendedProject = ProjectWithAnalytics & {
  company_name?: string
  companyName?: string
  client_company_name?: string
  epc_company_name?: string
}

type AdminTypeConfig = {
  key: string
  label: string
  shortLabel: string
  tone: string
}

const ADMIN_GROUPS = ['CLIENT', 'EPC', 'CONTRACTOR'] as const

const ADMIN_TYPES: AdminTypeConfig[] = [
  { key: 'client', label: 'CLIENT Admins', shortLabel: 'CLIENT', tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
  { key: 'epc', label: 'EPC Admins', shortLabel: 'EPC', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
  { key: 'contractor', label: 'CONTRACTOR Admins', shortLabel: 'CONTRACTOR', tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' },
].filter((type) => ADMIN_GROUPS.includes(type.shortLabel as typeof ADMIN_GROUPS[number]))

const metricCardClass = 'rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60'

const AdminUsers: React.FC = () => {
  const { user, hydrated } = useAuthStore()
  const [projects, setProjects] = useState<ProjectWithAnalytics[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectWithAnalytics | null>(null)
  const [adminGroups, setAdminGroups] = useState<AdminGroups>({})
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [adminUsers, setAdminUsers] = useState<CreatedUser[]>([])

  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentials, setCredentials] = useState<ProjectAdminCreateResponse | null>(null)
  const [createForm, setCreateForm] = useState({
    project_id: '',
    admin_type: '',
    username: '',
    company_name: '',
    registered_address: '',
  })

  useEffect(() => {
    if (hydrated && user) {
      loadProjects()
    }
  }, [hydrated, user])

  useEffect(() => {
    if (selectedProject) {
      loadProjectAdmins(selectedProject.id)
    }
  }, [selectedProject?.id])

  useEffect(() => {
    if (selectedAdmin) {
      loadAdminUsers(selectedAdmin.id)
    }
  }, [selectedAdmin?.id])

  const totalProjectStats = useMemo(() => {
    return projects.reduce(
      (stats, project) => ({
        admins: stats.admins + numberValue(project.admin_count),
        users: stats.users + numberValue(project.user_count),
        active: stats.active + numberValue(project.active_user_count),
      }),
      { admins: 0, users: 0, active: 0 }
    )
  }, [projects])

  const loadProjects = async () => {
    try {
      setProjectsLoading(true)
      setError(null)
      const data = await masterAdminService.getProjectsWithAnalytics()
      setProjects(data)
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load project analytics'
      setError(message)
      toast.error(message)
    } finally {
      setProjectsLoading(false)
    }
  }

  const loadProjectAdmins = async (projectId: number) => {
    try {
      setAdminsLoading(true)
      setError(null)
      setSelectedAdmin(null)
      setAdminUsers([])
      const data = await masterAdminService.getProjectAdmins(projectId)
      setAdminGroups(normalizeAdminGroups(data.grouped, data.all))
      setViewMode('hierarchy')
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load project admins'
      setError(message)
      toast.error(message)
    } finally {
      setAdminsLoading(false)
    }
  }

  const loadAdminUsers = async (adminId: number) => {
    try {
      setUsersLoading(true)
      setError(null)
      const data = await masterAdminService.getAdminUsers(adminId) as AdminCreatedUsersResponse
      setAdminUsers(data.users || [])
      setViewMode('users')
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load users created by admin'
      setError(message)
      toast.error(message)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleProjectSelect = (project: ProjectWithAnalytics) => {
    setSelectedProject(project)
    setCollapsedGroups({})
  }

  const handleAdminSelect = (admin: AdminUser) => {
    setSelectedAdmin(admin)
  }

  const goToProjects = () => {
    setViewMode('projects')
    setSelectedProject(null)
    setSelectedAdmin(null)
    setAdminGroups({})
    setAdminUsers([])
    setError(null)
  }

  const goToHierarchy = () => {
    setViewMode('hierarchy')
    setSelectedAdmin(null)
    setAdminUsers([])
    setError(null)
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleCreateAdmin = async () => {
    if (!createForm.project_id || !createForm.admin_type || !createForm.username || !createForm.company_name || !createForm.registered_address) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const result = await masterAdminService.createProjectAdmin({
        project_id: Number(createForm.project_id),
        admin_type: createForm.admin_type as 'client' | 'epc' | 'contractor',
        username: createForm.username.trim(),
        company_name: createForm.company_name.trim(),
        registered_address: createForm.registered_address.trim(),
      })

      toast.success('Admin user created successfully')
      setCredentials(result)
      setShowCreateModal(false)
      setShowCredentialsModal(true)
      downloadCredentials(result)
      setCreateForm({ project_id: '', admin_type: '', username: '', company_name: '', registered_address: '' })
      await loadProjects()
      if (selectedProject) {
        await loadProjectAdmins(selectedProject.id)
      }
    } catch (err: any) {
      const errorData = err?.response?.data
      const message = errorData?.username?.[0] || errorData?.project_id?.[0] || errorData?.admin_type?.[0] || errorData?.detail || errorData?.error || err?.message || 'Failed to create admin user'
      toast.error(message)
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

  const renderBreadcrumbs = () => (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <button onClick={goToProjects} className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
        Projects
      </button>
      {selectedProject && (
        <>
          <ChevronRight className="h-4 w-4" />
          <button onClick={goToHierarchy} className={cn('font-medium', viewMode === 'hierarchy' ? 'text-gray-900 dark:text-white' : 'text-blue-600 hover:text-blue-700 dark:text-blue-400')}>
            {selectedProject.projectName}
          </button>
        </>
      )}
      {selectedAdmin && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900 dark:text-white">{getAdminDisplayName(selectedAdmin)}</span>
          <ChevronRight className="h-4 w-4" />
          <span>Users</span>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {renderBreadcrumbs()}
            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">Admin Users</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Project-led admin hierarchy and created-user visibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {viewMode !== 'projects' && (
              <Button variant="outline" onClick={viewMode === 'users' ? goToHierarchy : goToProjects} icon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            )}
            <Button onClick={() => setShowCreateModal(true)} icon={<UserCheck className="h-4 w-4" />}>
              Create Admin
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </Card>
      )}

      {viewMode === 'projects' && (
        <ProjectListView
          loading={projectsLoading}
          projects={projects}
          totalStats={totalProjectStats}
          onProjectSelect={handleProjectSelect}
          onRetry={loadProjects}
        />
      )}

      {viewMode === 'hierarchy' && selectedProject && (
        <ProjectHierarchyView
          project={selectedProject}
          groups={adminGroups}
          collapsedGroups={collapsedGroups}
          loading={adminsLoading}
          onToggleGroup={toggleGroup}
          onAdminSelect={handleAdminSelect}
        />
      )}

      {viewMode === 'users' && selectedProject && selectedAdmin && (
        <AdminCreatedUsersView
          project={selectedProject}
          admin={selectedAdmin}
          users={adminUsers}
          loading={usersLoading}
        />
      )}

      <CreateAdminModal
        isOpen={showCreateModal}
        projects={projects}
        form={createForm}
        onChange={setCreateForm}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAdmin}
      />

      <Modal
        isOpen={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false)
          setCredentials(null)
        }}
        title="Admin User Created"
      >
        {credentials && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Password is shown only once. Credentials have been downloaded automatically.
            </div>
            <CredentialRow label="Username" value={credentials.username} onCopy={copyToClipboard} />
            <CredentialRow label="Password" value={credentials.password} onCopy={copyToClipboard} mono />
            <CredentialRow label="Admin Type" value={credentials.admin_type.toUpperCase()} onCopy={copyToClipboard} />
            <CredentialRow label="Company Name" value={credentials.company_name} onCopy={copyToClipboard} />
            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowCredentialsModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const ProjectListView: React.FC<{
  loading: boolean
  projects: ProjectWithAnalytics[]
  totalStats: { admins: number; users: number; active: number }
  onProjectSelect: (project: ProjectWithAnalytics) => void
  onRetry: () => void
}> = ({ loading, projects, totalStats, onProjectSelect, onRetry }) => {
  if (loading) {
    return <ProjectSkeletonGrid />
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="h-7 w-7" />}
        title="No projects found"
        description="Project analytics will appear here once projects are available."
        action={<Button variant="outline" onClick={onRetry}>Refresh</Button>}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Total Admins" value={totalStats.admins} icon={<ShieldCheck className="h-5 w-5" />} />
        <SummaryTile label="Total Users" value={totalStats.users} icon={<Users className="h-5 w-5" />} />
        <SummaryTile label="Active Users" value={totalStats.active} icon={<UserCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const extended = project as ExtendedProject
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onProjectSelect(project)}
              className="group text-left"
            >
              <Card className="h-full p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:shadow-lg dark:group-hover:border-blue-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 truncate text-lg font-semibold text-gray-900 dark:text-white">{project.projectName}</h2>
                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{getProjectCompanyName(extended)}</p>
                  </div>
                  <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniMetric label="Admins" value={project.admin_count} />
                  <MiniMetric label="Users" value={project.user_count} />
                  <MiniMetric label="Active" value={project.active_user_count} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <AdminCountBadge label="EPC" value={getAdminTypeCount(project, 'epc')} />
                  <AdminCountBadge label="Client" value={getAdminTypeCount(project, 'client')} />
                  <AdminCountBadge label="Contractor" value={getAdminTypeCount(project, 'contractor')} />
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ProjectHierarchyView: React.FC<{
  project: ProjectWithAnalytics
  groups: AdminGroups
  collapsedGroups: Record<string, boolean>
  loading: boolean
  onToggleGroup: (key: string) => void
  onAdminSelect: (admin: AdminUser) => void
}> = ({ project, groups, collapsedGroups, loading, onToggleGroup, onAdminSelect }) => {
  if (loading) {
    return <AdminGroupSkeleton />
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.projectName}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{getProjectCompanyName(project as ExtendedProject)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:flex">
            <MiniMetric label="Admins" value={project.admin_count} />
            <MiniMetric label="Users" value={project.user_count} />
            <MiniMetric label="Active" value={project.active_user_count} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {ADMIN_TYPES.map((type) => {
          const admins = groups[type.key] || []
          const isCollapsed = collapsedGroups[type.key]
          return (
            <Card key={type.key} className="p-0">
              <button
                type="button"
                onClick={() => onToggleGroup(type.key)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-md border', type.tone)}>
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{type.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Select an admin to view created users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{admins.length}</Badge>
                  {isCollapsed ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="border-t border-gray-200 p-5 dark:border-gray-700">
                  {admins.length === 0 ? (
                    <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                      No {type.shortLabel.toLowerCase()} admins assigned to this project.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {admins.map((admin) => (
                        <AdminCard key={admin.id} admin={admin} type={type} onSelect={onAdminSelect} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

const AdminCreatedUsersView: React.FC<{
  project: ProjectWithAnalytics
  admin: AdminUser
  users: CreatedUser[]
  loading: boolean
}> = ({ project, admin, users, loading }) => {
  if (loading) {
    return <UserSkeletonGrid />
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={getAdminDisplayName(admin)} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getAdminDisplayName(admin)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatAdminType(admin.admin_type)} admin for {project.projectName}
              </p>
            </div>
          </div>
          <Badge variant={admin.is_active ? 'success' : 'error'}>{admin.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </Card>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No users created"
          description={`${getAdminDisplayName(admin)} has not created any users yet.`}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {users.map((createdUser) => (
            <CreatedUserCard key={createdUser.id} user={createdUser} />
          ))}
        </div>
      )}
    </div>
  )
}

const AdminCard: React.FC<{
  admin: AdminUser
  type: AdminTypeConfig
  onSelect: (admin: AdminUser) => void
}> = ({ admin, type, onSelect }) => (
  <button type="button" onClick={() => onSelect(admin)} className="group text-left">
    <Card className="h-full p-4 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:shadow-md dark:group-hover:border-blue-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={getAdminDisplayName(admin)} />
          <div className="min-w-0">
            <h4 className="truncate font-semibold text-gray-900 dark:text-white">{getAdminDisplayName(admin)}</h4>
            <p className="truncate text-sm text-gray-600 dark:text-gray-400">{admin.company_name || 'Company not mapped'}</p>
          </div>
        </div>
        <Badge variant={admin.is_active ? 'success' : 'error'}>{admin.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={metricCardClass}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(admin.created_at)}</p>
        </div>
        <div className={metricCardClass}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Users Created</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{numberValue(admin.users_created_count)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', type.tone)}>{type.shortLabel}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
          View users <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Card>
  </button>
)

const CreatedUserCard: React.FC<{ user: CreatedUser }> = ({ user }) => (
  <Card className="p-4 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user.name || user.username} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">{user.username}</h3>
          <p className="truncate text-sm text-gray-600 dark:text-gray-400">{user.role || user.role_type || user.company_type || 'Role not assigned'}</p>
        </div>
      </div>
      <Badge variant={user.is_active ? 'success' : 'error'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
      <UserMetric icon={<ClipboardCheck className="h-4 w-4" />} label="Attendance" value={`${getAttendance(user)}%`} />
      <UserMetric icon={<ShieldCheck className="h-4 w-4" />} label="Induction" value={getInductionStatus(user)} />
      <UserMetric icon={<FolderKanban className="h-4 w-4" />} label="PTW Count" value={numberValue(user.ptw_count ?? user.permit_count)} />
      <UserMetric icon={<Clock className="h-4 w-4" />} label="Last Login" value={formatDateTime(user.last_login)} />
      <UserMetric icon={<UserCheck className="h-4 w-4" />} label="Safety Score" value={user.safety_score ?? 'N/A'} />
      <UserMetric icon={<CalendarDays className="h-4 w-4" />} label="Status" value={user.status || user.approval_status || 'N/A'} />
    </div>
  </Card>
)

const CreateAdminModal: React.FC<{
  isOpen: boolean
  projects: ProjectWithAnalytics[]
  form: { project_id: string; admin_type: string; username: string; company_name: string; registered_address: string }
  onChange: React.Dispatch<React.SetStateAction<{ project_id: string; admin_type: string; username: string; company_name: string; registered_address: string }>>
  onClose: () => void
  onSubmit: () => void
}> = ({ isOpen, projects, form, onChange, onClose, onSubmit }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Create Project Admin">
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          value={form.project_id}
          onChange={(e) => onChange({ ...form, project_id: e.target.value })}
        >
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.projectName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Type *</label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          value={form.admin_type}
          onChange={(e) => onChange({ ...form, admin_type: e.target.value })}
        >
          <option value="">Select admin type</option>
          <option value="client">Client Admin</option>
          <option value="epc">EPC Admin</option>
          <option value="contractor">Contractor Admin</option>
        </select>
      </div>
      <Input placeholder="Username *" value={form.username} onChange={(e) => onChange({ ...form, username: e.target.value })} />
      <Input placeholder="Company Name *" value={form.company_name} onChange={(e) => onChange({ ...form, company_name: e.target.value })} />
      <textarea
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        rows={3}
        placeholder="Registered office address *"
        value={form.registered_address}
        onChange={(e) => onChange({ ...form, registered_address: e.target.value })}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit}>Create Admin</Button>
      </div>
    </div>
  </Modal>
)

const CredentialRow: React.FC<{ label: string; value: string; mono?: boolean; onCopy: (text: string, label: string) => void }> = ({ label, value, mono, onCopy }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="flex gap-2">
      <Input value={value} readOnly className={mono ? 'font-mono' : undefined} />
      <Button variant="outline" size="sm" onClick={() => onCopy(value, label)}>Copy</Button>
    </div>
  </div>
)

const SummaryTile: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{icon}</span>
    </div>
  </Card>
)

const MiniMetric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className={metricCardClass}>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{value ?? 0}</p>
  </div>
)

const AdminCountBadge: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
    <span className="text-gray-600 dark:text-gray-400">{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)

const UserMetric: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className={metricCardClass}>
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
    <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">{value}</p>
  </div>
)

const Avatar: React.FC<{ name: string }> = ({ name }) => (
  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
    {getInitials(name)}
  </span>
)

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <Card className="p-10 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400">{icon}</div>
    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </Card>
)

const ProjectSkeletonGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
  </div>
)

const AdminGroupSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} lines={4} />)}
  </div>
)

const UserSkeletonGrid = () => (
  <div className="grid gap-4 lg:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} lines={5} />)}
  </div>
)

const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 6 }) => (
  <Card className="p-5">
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className={cn('h-3 rounded bg-gray-200 dark:bg-gray-700', index % 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  </Card>
)

const normalizeAdminGroups = (grouped: AdminGroups = {}, all: AdminUser[] = {} as AdminUser[]): AdminGroups => {
  const normalized: AdminGroups = ADMIN_TYPES.reduce((acc, type) => ({ ...acc, [type.key]: [] }), {})
  Object.entries(grouped || {}).forEach(([key, admins]) => {
    const normalizedType = normalizeType(key)
    if (normalizedType in normalized) {
      normalized[normalizedType] = admins || []
    }
  })
  if (Object.values(normalized).every((admins) => admins.length === 0) && all?.length) {
    all.forEach((admin) => {
      const key = normalizeType(admin.admin_type)
      if (key in normalized) {
        normalized[key] = [...(normalized[key] || []), admin]
      }
    })
  }
  return normalized
}

const getProjectCompanyName = (project: ExtendedProject) => {
  return project.company_name || project.companyName || project.client_company_name || project.epc_company_name || project.subscriber_role || 'Company not mapped'
}

const getAdminTypeCount = (project: ProjectWithAnalytics, type: string) => {
  const counts = project.admin_type_counts || {}
  return numberValue(counts[type] ?? counts[type.toUpperCase()] ?? counts[formatAdminType(type)])
}

const getAdminDisplayName = (admin: AdminUser) => admin.name || admin.username
const formatAdminType = (type?: string) => (type ? type.replace(/_/g, ' ').toUpperCase() : 'UNASSIGNED')
const normalizeType = (type?: string) => (type || '').toLowerCase().replace(/ admin/g, '').replace(/_/g, '')
const numberValue = (value: unknown) => Number(value || 0)
const getAttendance = (user: CreatedUser) => numberValue(user.attendance_percentage ?? user.attendance_percent ?? user.attendance)
const getInductionStatus = (user: CreatedUser) => user.induction_status || (user.induction_attended ? 'Completed' : 'Pending')
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : 'N/A')
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'N/A')
const getInitials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AU'

export default AdminUsers
