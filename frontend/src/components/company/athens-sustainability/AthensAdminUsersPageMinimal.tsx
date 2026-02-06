import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, RefreshCw, Copy, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { Modal } from '../../ui/Modal'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { athensSustCompanyApi, type AthensEmployeeUser } from '../../../services/athensSustCompanyApi'
import toast from 'react-hot-toast'

const AthensAdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [credentials, setCredentials] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [createForm, setCreateForm] = useState({
    project: '',
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    designation: '',
    grade: 'C',
    phone_number: ''
  })

  const { data: employees, isLoading } = useQuery({
    queryKey: ['athens-employees', selectedProject],
    queryFn: () => athensSustCompanyApi.listEmployees(selectedProject ? { project_id: selectedProject } : {}),
    retry: false,
    enabled: !!selectedProject
  })

  const { data: projects } = useQuery({
    queryKey: ['athens-projects'],
    queryFn: () => athensSustCompanyApi.listProjects(),
    retry: false
  })

  const { data: pendingApprovals, isLoading: isApprovalsLoading } = useQuery({
    queryKey: ['athens-user-approvals', selectedProject],
    queryFn: () => selectedProject ? athensSustCompanyApi.listUserApprovals({ project_id: selectedProject }) : Promise.resolve([]),
    retry: false,
    enabled: !!selectedProject
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => athensSustCompanyApi.approveUserProfile(id),
    onSuccess: () => {
      toast.success('User approved')
      queryClient.invalidateQueries({ queryKey: ['athens-user-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['athens-employees'] })
    },
    onError: () => toast.error('Failed to approve user')
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => athensSustCompanyApi.rejectUserProfile(id, reason),
    onSuccess: () => {
      toast.success('User rejected')
      queryClient.invalidateQueries({ queryKey: ['athens-user-approvals'] })
    },
    onError: () => toast.error('Failed to reject user')
  })

  const requestChangesMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => athensSustCompanyApi.requestUserProfileChanges(id, reason),
    onSuccess: () => {
      toast.success('Changes requested')
      queryClient.invalidateQueries({ queryKey: ['athens-user-approvals'] })
    },
    onError: () => toast.error('Failed to request changes')
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => athensSustCompanyApi.createEmployee(payload),
    onSuccess: (data) => {
      setCredentials(data)
      toast.success('Employee created successfully')
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: ['athens-employees'] })
      setCreateForm({
        project: '',
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        designation: '',
        grade: 'C',
        phone_number: ''
      })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create employee')
    }
  })

  const handleCreate = () => {
    if (!createForm.project || !createForm.email || !createForm.first_name || !createForm.last_name || !createForm.department || !createForm.designation || !createForm.phone_number) {
      toast.error('Please fill all required fields')
      return
    }

    createMutation.mutate({
      project_id: Number(createForm.project),
      email: createForm.email,
      first_name: createForm.first_name,
      last_name: createForm.last_name,
      department: createForm.department,
      designation: createForm.designation,
      grade: createForm.grade,
      phone_number: createForm.phone_number
    })
  }

  const handleCopyCredentials = () => {
    if (!credentials?.temp_password) return
    navigator.clipboard.writeText(credentials.temp_password)
    toast.success('Temporary password copied')
  }

  const handleDownloadCredentials = () => {
    if (!credentials?.temp_password) return
    const currentDate = new Date().toLocaleString()
    const credentialsText = `
═══════════════════════════════════════════════════════════════
                ATHENS EMPLOYEE CREDENTIALS
═══════════════════════════════════════════════════════════════

User: ${credentials.email}
Email: ${credentials.email}
Created: ${currentDate}

═══════════════════════════════════════════════════════════════
                    LOGIN DETAILS
═══════════════════════════════════════════════════════════════

Username: ${credentials.username}
Temporary Password: ${credentials.temp_password}

Note: Please reset this password on first login.
`.trim()

    const blob = new Blob([credentialsText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `athens_employee_credentials_${credentials.username}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const projectList = Array.isArray(projects) ? projects : (projects?.results || [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees
            </CardTitle>
            <p className="text-sm text-gray-500">Create and manage employee users within your project scope</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['athens-employees'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <Select
              value={selectedProject}
              onChange={(value) => setSelectedProject(value)}
              className="sm:w-64"
            >
              <option value="">All Projects</option>
              {projectList.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>

          {!selectedProject ? (
            <p className="text-sm text-gray-500">Select a project to view employees.</p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-3">Name</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Department</th>
                    <th className="py-3">Designation</th>
                    <th className="py-3">Grade</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(employees || []).map((employee: AthensEmployeeUser) => (
                    <tr key={employee.id} className="border-b last:border-b-0">
                      <td className="py-3 font-medium text-gray-900">{employee.full_name}</td>
                      <td className="py-3 text-gray-600">{employee.email}</td>
                      <td className="py-3 text-gray-600">{employee.department || '-'}</td>
                      <td className="py-3 text-gray-600">{employee.designation || '-'}</td>
                      <td className="py-3 text-gray-600">{employee.grade || '-'}</td>
                      <td className="py-3 text-gray-600">{employee.profile_status || 'not_started'}</td>
                    </tr>
                  ))}
                  {(!employees || employees.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No employees found for the selected project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProject && (
            <p className="text-sm text-gray-500">Select a project to review submissions.</p>
          )}
          {selectedProject && isApprovalsLoading && (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          )}
          {selectedProject && !isApprovalsLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-3">Name</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Submitted</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingApprovals || []).map((profile: any) => (
                    <tr key={profile.id} className="border-b last:border-b-0">
                      <td className="py-3 font-medium text-gray-900">{profile.full_name}</td>
                      <td className="py-3 text-gray-600">{profile.email}</td>
                      <td className="py-3 text-gray-600">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => approveMutation.mutate(profile.id)}>Approve</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = window.prompt('Reason for changes (optional)') || undefined
                              requestChangesMutation.mutate({ id: profile.id, reason })
                            }}
                          >
                            Request Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = window.prompt('Reason for rejection (optional)') || undefined
                              rejectMutation.mutate({ id: profile.id, reason })
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {selectedProject && (!pendingApprovals || pendingApprovals.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No pending approvals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Employee">
        <div className="space-y-4">
          <Select
            value={createForm.project}
            onChange={(value) => setCreateForm({ ...createForm, project: value })}
          >
            <option value="">Select Project</option>
            {projectList.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="First name"
              value={createForm.first_name}
              onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
            />
            <Input
              placeholder="Last name"
              value={createForm.last_name}
              onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
            />
          </div>
          <Input
            placeholder="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <Input
            placeholder="Department"
            value={createForm.department}
            onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
          />
          <Input
            placeholder="Designation"
            value={createForm.designation}
            onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              value={createForm.grade}
              onChange={(value) => setCreateForm({ ...createForm, grade: value })}
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </Select>
            <Input
              placeholder="Phone number"
              value={createForm.phone_number}
              onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title="Temporary Credentials">
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-gray-50">
            <p className="text-sm text-gray-600">Username</p>
            <p className="font-medium text-gray-900">{credentials?.username}</p>
            <p className="text-sm text-gray-600 mt-3">Temporary Password</p>
            <p className="font-mono font-semibold text-gray-900">{credentials?.temp_password}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopyCredentials}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Password
            </Button>
            <Button onClick={handleDownloadCredentials}>
              <Download className="h-4 w-4 mr-2" />
              Download Slip
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AthensAdminUsersPage
