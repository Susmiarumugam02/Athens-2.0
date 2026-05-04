import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, Plus, Edit, Eye, Trash2, MapPin, Calendar, Users, Building2, AlertCircle, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { athensSustainabilityApi, type AthensSustProject, type ProjectCreateData } from '../../services/athensSustainabilityApi'
import toast from 'react-hot-toast'

interface AthensProjectsProps {
  onNavigateToTab?: (tab: string) => void
}

const AthensProjects: React.FC<AthensProjectsProps> = () => {
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()
  const queryClient = useQueryClient()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<AthensSustProject | null>(null)
  
  const [formData, setFormData] = useState<ProjectCreateData>({
    name: '',
    category: '',
    capacity: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    nearest_police_station: '',
    nearest_police_contact: '',
    nearest_hospital: '',
    nearest_hospital_contact: '',
    commencement_date: '',
    deadline_date: ''
  })

  const projectCategories = [
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

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['athens-sust-projects'],
    queryFn: () => athensSustainabilityApi.getProjects(),
    enabled: isEnabled,
    refetchInterval: 30000
  })

  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectCreateData) => athensSustainabilityApi.createProject(data),
    onSuccess: () => {
      toast.success('Project created successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-sust-projects'] })
      queryClient.invalidateQueries({ queryKey: ['athens-sust-dashboard-overview'] })
      setShowCreateModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create project')
    }
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectCreateData> }) => 
      athensSustainabilityApi.updateProject(id, data),
    onSuccess: () => {
      toast.success('Project updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-sust-projects'] })
      setShowEditModal(false)
      setSelectedProject(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update project')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      capacity: '',
      location: '',
      latitude: undefined,
      longitude: undefined,
      nearest_police_station: '',
      nearest_police_contact: '',
      nearest_hospital: '',
      nearest_hospital_contact: '',
      commencement_date: '',
      deadline_date: ''
    })
  }

  const handleCreateProject = () => {
    if (!formData.name || !formData.category || !formData.location || !formData.commencement_date || !formData.deadline_date) {
      toast.error('Please fill all required fields')
      return
    }

    if (new Date(formData.deadline_date) <= new Date(formData.commencement_date)) {
      toast.error('Deadline date must be after commencement date')
      return
    }

    createProjectMutation.mutate(formData)
  }

  const handleEditProject = (project: AthensSustProject) => {
    setSelectedProject(project)
    setFormData({
      name: project.name,
      category: project.category,
      capacity: project.capacity,
      location: project.location,
      latitude: project.latitude,
      longitude: project.longitude,
      nearest_police_station: project.nearest_police_station,
      nearest_police_contact: project.nearest_police_contact,
      nearest_hospital: project.nearest_hospital,
      nearest_hospital_contact: project.nearest_hospital_contact,
      commencement_date: project.commencement_date,
      deadline_date: project.deadline_date
    })
    setShowEditModal(true)
  }

  const handleUpdateProject = () => {
    if (!selectedProject) return
    
    if (!formData.name || !formData.category || !formData.location || !formData.commencement_date || !formData.deadline_date) {
      toast.error('Please fill all required fields')
      return
    }

    updateProjectMutation.mutate({ id: selectedProject.id, data: formData })
  }

  const handleViewProject = (project: AthensSustProject) => {
    setSelectedProject(project)
    setShowViewModal(true)
  }

  if (serviceLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading projects..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">
                Athens Sustainability Service Not Available
              </h3>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Your company does not have access to Athens Sustainability service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const projects = projectsData?.results || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Projects
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your sustainability projects
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Projects Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first sustainability project to get started
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {project.category.replace('_', ' ')}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {project.is_active ? 'Active' : 'Archived'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    {project.location}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(project.commencement_date).toLocaleDateString()} - {new Date(project.deadline_date).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-2" />
                    {project.members_count} members
                  </div>
                  
                  {project.capacity && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Building2 className="h-4 w-4 mr-2" />
                      Capacity: {project.capacity}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewProject(project)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {}}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Create New Project"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <option value="">Select category...</option>
                {projectCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter project location"
              />
            </div>

            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="Enter project capacity"
              />
            </div>

            <div>
              <Label htmlFor="commencement_date">Commencement Date *</Label>
              <Input
                id="commencement_date"
                type="date"
                value={formData.commencement_date}
                onChange={(e) => setFormData(prev => ({ ...prev, commencement_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="deadline_date">Deadline Date *</Label>
              <Input
                id="deadline_date"
                type="date"
                value={formData.deadline_date}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedProject(null)
        }}
        title="Edit Project"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <option value="">Select category...</option>
                {projectCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-location">Location *</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter project location"
              />
            </div>

            <div>
              <Label htmlFor="edit-capacity">Capacity</Label>
              <Input
                id="edit-capacity"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="Enter project capacity"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false)
                setSelectedProject(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProject}
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Project
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Project Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedProject(null)
        }}
        title="Project Details"
        size="lg"
      >
        {selectedProject && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Project Name</Label>
                <p className="text-gray-900 dark:text-white font-medium">{selectedProject.name}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p className="text-gray-900 dark:text-white capitalize">{selectedProject.category.replace('_', ' ')}</p>
              </div>
              <div>
                <Label>Location</Label>
                <p className="text-gray-900 dark:text-white">{selectedProject.location}</p>
              </div>
              <div>
                <Label>Capacity</Label>
                <p className="text-gray-900 dark:text-white">{selectedProject.capacity || 'Not specified'}</p>
              </div>
              <div>
                <Label>Commencement Date</Label>
                <p className="text-gray-900 dark:text-white">{new Date(selectedProject.commencement_date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Deadline Date</Label>
                <p className="text-gray-900 dark:text-white">{new Date(selectedProject.deadline_date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className={`font-medium ${selectedProject.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                  {selectedProject.is_active ? 'Active' : 'Archived'}
                </p>
              </div>
              <div>
                <Label>Members</Label>
                <p className="text-gray-900 dark:text-white">{selectedProject.members_count} members</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AthensProjects