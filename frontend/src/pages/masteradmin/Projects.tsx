import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { masterAdminService } from '../../services/masteradmin'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface Project {
  id: number
  projectName: string
  projectCategory: string
  capacity: string
  location: string
  commencementDate: string
  deadlineDate: string
  nearestPoliceStation: string
  nearestPoliceStationContact?: string
  nearestHospital: string
  nearestHospitalContact?: string
  subscriber_role?: string
  epc_company_ids?: string[]
}

const Projects: React.FC = () => {
  const { user, hydrated } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [createForm, setCreateForm] = useState({
    projectName: '',
    projectCategory: '',
    capacity: '',
    location: '',
    nearestPoliceStation: '',
    nearestPoliceStationContact: '',
    nearestHospital: '',
    nearestHospitalContact: '',
    commencementDate: '',
    deadlineDate: '',
    subscriber_role: '',
    epc_company_ids: [] as string[]
  })

  useEffect(() => {
    // Only load projects if user is authenticated and hydrated
    if (hydrated && user) {
      loadProjects()
    }
  }, [hydrated, user])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await masterAdminService.getProjects()
      setProjects(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load projects')
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleViewProject = (project: Project) => {
    setSelectedProject(project)
    setShowViewModal(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setCreateForm({
      projectName: project.projectName,
      projectCategory: project.projectCategory,
      capacity: project.capacity,
      location: project.location,
      nearestPoliceStation: project.nearestPoliceStation,
      nearestPoliceStationContact: project.nearestPoliceStationContact,
      nearestHospital: project.nearestHospital,
      nearestHospitalContact: project.nearestHospitalContact,
      commencementDate: project.commencementDate,
      deadlineDate: project.deadlineDate,
      subscriber_role: project.subscriber_role || '',
      epc_company_ids: project.epc_company_ids || []
    })
    setShowEditModal(true)
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      await masterAdminService.deleteProject(projectId)
      toast.success('Project deleted successfully')
      loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project')
    }
  }

  const handleUpdateProject = async () => {
    if (!selectedProject || !createForm.projectName || !createForm.projectCategory || !createForm.location) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      await masterAdminService.updateProject(selectedProject.id, createForm)
      toast.success('Project updated successfully')
      setShowEditModal(false)
      setSelectedProject(null)
      setCreateForm({
        projectName: '',
        projectCategory: '',
        capacity: '',
        location: '',
        nearestPoliceStation: '',
        nearestPoliceStationContact: '',
        nearestHospital: '',
        nearestHospitalContact: '',
        commencementDate: '',
        deadlineDate: '',
        subscriber_role: '',
        epc_company_ids: []
      })
      loadProjects()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update project')
    }
  }
  const handleCreateProject = async () => {
    if (!createForm.projectName || !createForm.projectCategory || !createForm.location || !createForm.subscriber_role) {
      toast.error('Please fill in required fields (Name, Category, Location, Subscriber Role)')
      return
    }

    try {
      await masterAdminService.createProject(createForm)
      toast.success('Project created successfully')
      setShowCreateModal(false)
      setCreateForm({
        projectName: '',
        projectCategory: '',
        capacity: '',
        location: '',
        nearestPoliceStation: '',
        nearestPoliceStationContact: '',
        nearestHospital: '',
        nearestHospitalContact: '',
        commencementDate: '',
        deadlineDate: '',
        subscriber_role: '',
        epc_company_ids: []
      })
      loadProjects() // Refresh the list
    } catch (err: any) {
      const errorMsg = err.response?.data?.subscriber_role?.[0] || 
                       err.response?.data?.error ||
                       err.message || 
                       'Failed to create project'
      toast.error(errorMsg)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      construction: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      manufacturing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      chemical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      oil_and_gas: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      power_and_energy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const isProjectActive = (deadlineDate: string) => {
    return new Date(deadlineDate) >= new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadProjects} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Projects
        </h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first project.</p>
          <Button onClick={() => setShowCreateModal(true)}>Create Project</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {project.projectName}
                </h3>
                <Badge className={getCategoryColor(project.projectCategory)}>
                  {project.projectCategory.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {project.location}
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {project.capacity}
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(project.commencementDate).toLocaleDateString()} - {new Date(project.deadlineDate).toLocaleDateString()}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Badge variant={isProjectActive(project.deadlineDate) ? 'success' : 'secondary'}>
                    {isProjectActive(project.deadlineDate) ? 'Active' : 'Completed'}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewProject(project)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditProject(project)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = `/master-admin/projects/${project.id}/modules`}>
                      Modules
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Project">
        <div className="space-y-4">
          <Input
            placeholder="Project Name *"
            value={createForm.projectName}
            onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
          />
          <Select
            value={createForm.projectCategory}
            onChange={(value) => setCreateForm({ ...createForm, projectCategory: value })}
          >
            <option value="">Select Category *</option>
            <option value="construction">Construction</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="chemical">Chemical</option>
            <option value="oil_and_gas">Oil & Gas</option>
            <option value="power_and_energy">Power & Energy</option>
            <option value="logistics">Logistics</option>
            <option value="mining">Mining</option>
            <option value="aviation">Aviation</option>
          </Select>
          <Select
            value={createForm.subscriber_role}
            onChange={(value) => setCreateForm({ ...createForm, subscriber_role: value })}
          >
            <option value="">Select Subscriber Role *</option>
            <option value="client">Client (can add multiple EPCs)</option>
            <option value="epc">EPC (one client only)</option>
          </Select>
          <Input
            placeholder="Capacity"
            value={createForm.capacity}
            onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })}
          />
          <Input
            placeholder="Location *"
            value={createForm.location}
            onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
          />
          <Input
            placeholder="Nearest Police Station"
            value={createForm.nearestPoliceStation}
            onChange={(e) => setCreateForm({ ...createForm, nearestPoliceStation: e.target.value })}
          />
          <Input
            placeholder="Police Station Contact"
            value={createForm.nearestPoliceStationContact}
            onChange={(e) => setCreateForm({ ...createForm, nearestPoliceStationContact: e.target.value })}
          />
          <Input
            placeholder="Nearest Hospital"
            value={createForm.nearestHospital}
            onChange={(e) => setCreateForm({ ...createForm, nearestHospital: e.target.value })}
          />
          <Input
            placeholder="Hospital Contact"
            value={createForm.nearestHospitalContact}
            onChange={(e) => setCreateForm({ ...createForm, nearestHospitalContact: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              placeholder="Commencement Date"
              value={createForm.commencementDate}
              onChange={(e) => setCreateForm({ ...createForm, commencementDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Deadline Date"
              value={createForm.deadlineDate}
              onChange={(e) => setCreateForm({ ...createForm, deadlineDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project">
        <div className="space-y-4">
          <Input
            placeholder="Project Name *"
            value={createForm.projectName}
            onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
          />
          <Select
            value={createForm.projectCategory}
            onChange={(value) => setCreateForm({ ...createForm, projectCategory: value })}
          >
            <option value="">Select Category *</option>
            <option value="construction">Construction</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="chemical">Chemical</option>
            <option value="oil_and_gas">Oil & Gas</option>
            <option value="power_and_energy">Power & Energy</option>
            <option value="logistics">Logistics</option>
            <option value="mining">Mining</option>
            <option value="aviation">Aviation</option>
          </Select>
          <Select
            value={createForm.subscriber_role}
            onChange={(value) => setCreateForm({ ...createForm, subscriber_role: value })}
          >
            <option value="">Select Subscriber Role *</option>
            <option value="client">Client (can add multiple EPCs)</option>
            <option value="epc">EPC (one client only)</option>
          </Select>
          <Input
            placeholder="Capacity"
            value={createForm.capacity}
            onChange={(e) => setCreateForm({ ...createForm, capacity: e.target.value })}
          />
          <Input
            placeholder="Location *"
            value={createForm.location}
            onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
          />
          <Input
            placeholder="Nearest Police Station"
            value={createForm.nearestPoliceStation}
            onChange={(e) => setCreateForm({ ...createForm, nearestPoliceStation: e.target.value })}
          />
          <Input
            placeholder="Police Station Contact"
            value={createForm.nearestPoliceStationContact}
            onChange={(e) => setCreateForm({ ...createForm, nearestPoliceStationContact: e.target.value })}
          />
          <Input
            placeholder="Nearest Hospital"
            value={createForm.nearestHospital}
            onChange={(e) => setCreateForm({ ...createForm, nearestHospital: e.target.value })}
          />
          <Input
            placeholder="Hospital Contact"
            value={createForm.nearestHospitalContact}
            onChange={(e) => setCreateForm({ ...createForm, nearestHospitalContact: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              placeholder="Commencement Date"
              value={createForm.commencementDate}
              onChange={(e) => setCreateForm({ ...createForm, commencementDate: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Deadline Date"
              value={createForm.deadlineDate}
              onChange={(e) => setCreateForm({ ...createForm, deadlineDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject}>
              Update Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Project Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Project Details">
        {selectedProject && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.projectName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.projectCategory}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subscriber Role
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.subscriber_role || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Capacity
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.capacity}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.location}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Police Station
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.nearestPoliceStation || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Police Station Contact
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.nearestPoliceStationContact || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hospital
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.nearestHospital || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hospital Contact
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{selectedProject.nearestHospitalContact || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{new Date(selectedProject.commencementDate).toLocaleDateString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <div className="text-sm text-gray-900 dark:text-white">{new Date(selectedProject.deadlineDate).toLocaleDateString()}</div>
              </div>
              {selectedProject.epc_company_ids && selectedProject.epc_company_ids.length > 0 && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    EPC Companies
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">{selectedProject.epc_company_ids.join(', ')}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Projects