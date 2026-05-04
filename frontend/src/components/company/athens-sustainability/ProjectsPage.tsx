import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Settings, Users, Trash2, Pencil } from 'lucide-react'
import { athensSustCompanyApi, type AthensSustProject } from '../../../services/athensSustCompanyApi'
import { Button } from '../../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { Modal } from '../../ui/Modal'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { DataTable } from '../../ui/DataTable'
import toast from 'react-hot-toast'
import AthensServiceGate from './AthensServiceGate'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'

const STORAGE_KEY = 'ATHENS_SUST_SELECTED_PROJECT'

const CATEGORY_OPTIONS = [
  { value: 'governments', label: 'Governments' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'construction', label: 'Construction' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'port_and_maritime', label: 'Port and Maritime' },
  { value: 'power_and_energy', label: 'Power and Energy' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'schools', label: 'Schools' },
  { value: 'mining', label: 'Mining' },
  { value: 'oil_and_gas', label: 'Oil & Gas' },
  { value: 'shopping_mall', label: 'Shopping Mall' },
  { value: 'aviation', label: 'Aviation' }
]

interface ProjectsPageProps {
  onNavigate?: (tabId: string) => void
}

const emptyProjectForm: Partial<AthensSustProject> = {
  name: '',
  category: 'construction',
  capacity_size: '',
  city: '',
  state: '',
  latitude: undefined,
  longitude: undefined,
  police_station_name: '',
  police_station_contact: '',
  hospital_name: '',
  hospital_contact: '',
  commencement_date: '',
  deadline_date: ''
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient()
  const { isEnabled } = useAthensSustainabilityEnabled()
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [showModal, setShowModal] = React.useState(false)
  const [editingProject, setEditingProject] = React.useState<AthensSustProject | null>(null)
  const [formData, setFormData] = React.useState<Partial<AthensSustProject>>(emptyProjectForm)
  const [formError, setFormError] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['athens-projects', search, category],
    queryFn: () => athensSustCompanyApi.listProjects({ search, category, status: 'active' }),
    enabled: isEnabled
  })

  const projects = Array.isArray(data) ? data : data?.results || []

  const createMutation = useMutation({
    mutationFn: (payload: Partial<AthensSustProject>) => athensSustCompanyApi.createProject(payload),
    onSuccess: () => {
      toast.success('Project saved')
      setShowModal(false)
      setFormData(emptyProjectForm)
      setEditingProject(null)
      queryClient.invalidateQueries({ queryKey: ['athens-projects'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to save project')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<AthensSustProject>) => athensSustCompanyApi.updateProject(editingProject!.id, payload),
    onSuccess: () => {
      toast.success('Project updated')
      setShowModal(false)
      setFormData(emptyProjectForm)
      setEditingProject(null)
      queryClient.invalidateQueries({ queryKey: ['athens-projects'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update project')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => athensSustCompanyApi.deleteProject(id),
    onSuccess: () => {
      toast.success('Project deleted')
      queryClient.invalidateQueries({ queryKey: ['athens-projects'] })
    },
    onError: () => toast.error('Failed to delete project')
  })

  const openCreateModal = () => {
    setEditingProject(null)
    setFormData(emptyProjectForm)
    setFormError(null)
    setShowModal(true)
  }

  const openEditModal = (project: AthensSustProject) => {
    setEditingProject(project)
    setFormData({
      ...project,
      capacity_size: project.capacity_size || project.capacity || ''
    })
    setFormError(null)
    setShowModal(true)
  }

  const validateForm = () => {
    if (!formData.name) return 'Project name is required.'
    if (!formData.city || !formData.state) return 'City and state are required.'
    if (!formData.commencement_date || !formData.deadline_date) return 'Timeline dates are required.'
    if (formData.deadline_date < formData.commencement_date) return 'Deadline must be after commencement date.'
    return null
  }

  const handleSubmit = () => {
    const error = validateForm()
    if (error) {
      setFormError(error)
      return
    }

    const payload = {
      ...formData,
      capacity_size: formData.capacity_size || '',
      police_station_name: formData.police_station_name || '',
      police_station_contact: formData.police_station_contact || '',
      hospital_name: formData.hospital_name || '',
      hospital_contact: formData.hospital_contact || ''
    }

    if (editingProject) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleQuickNavigate = (tabId: string, projectId: number) => {
    localStorage.setItem(STORAGE_KEY, projectId.toString())
    onNavigate?.(tabId)
  }

  return (
    <AthensServiceGate>
      <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage sustainability project portfolio and details.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" /> Create New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <Input
                placeholder="Search projects"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={category}
              onChange={(value) => setCategory(value)}
              options={[{ value: '', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
            />
          </div>

          {isLoading ? (
            <LoadingSpinner size="lg" text="Loading projects..." />
          ) : (
            <DataTable
              data={projects}
              columns={[
                { key: 'name', header: 'Project' },
                { key: 'category', header: 'Category' },
                { key: 'city', header: 'City' },
                { key: 'state', header: 'State' },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (project) => (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(project)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickNavigate('athens-menu-management', project.id)}>
                        <Settings className="h-3 w-3 mr-1" /> Configure Modules
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickNavigate('athens-admin-users', project.id)}>
                        <Users className="h-3 w-3 mr-1" /> Employees
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(project.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  )
                }
              ]}
              emptyMessage="No projects found"
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProject ? 'Edit Project' : 'Create Project'}
        size="2xl"
      >
        <div className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Project Name</label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Category</label>
              <Select
                value={formData.category || ''}
                onChange={(value) => setFormData({ ...formData, category: value })}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Capacity / Size</label>
              <Input value={formData.capacity_size || ''} onChange={(e) => setFormData({ ...formData, capacity_size: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Search Location</label>
              <Input placeholder="Search location" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">City</label>
              <Input value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">State</label>
              <Input value={formData.state || ''} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Latitude</label>
              <Input
                type="number"
                value={formData.latitude ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, latitude: value ? Number(value) : undefined })
                }}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Longitude</label>
              <Input
                type="number"
                value={formData.longitude ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, longitude: value ? Number(value) : undefined })
                }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">Tip: laptop GPS may be inaccurate. Verify coordinates before saving.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Police Station Name</label>
              <Input value={formData.police_station_name || ''} onChange={(e) => setFormData({ ...formData, police_station_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Police Contact</label>
              <Input value={formData.police_station_contact || ''} onChange={(e) => setFormData({ ...formData, police_station_contact: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Hospital Name</label>
              <Input value={formData.hospital_name || ''} onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Hospital Contact</label>
              <Input value={formData.hospital_contact || ''} onChange={(e) => setFormData({ ...formData, hospital_contact: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Commencement Date</label>
              <Input type="date" value={formData.commencement_date || ''} onChange={(e) => setFormData({ ...formData, commencement_date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Deadline Date</label>
              <Input type="date" value={formData.deadline_date || ''} onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </AthensServiceGate>
  )
}

export default ProjectsPage
