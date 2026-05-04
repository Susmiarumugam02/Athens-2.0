import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { PageContainer } from '../../../components/layout/PageContainer'
import { athensSustainabilityApi } from '../../../services/athensSustainabilityApi'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'
import toast from 'react-hot-toast'

const ProjectSelection: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()
  const [selectedProject, setSelectedProject] = useState<number | null>(null)

  // Redirect if service not enabled
  useEffect(() => {
    if (!serviceLoading && !isEnabled) {
      navigate('/dashboard')
      toast.error('Athens Sustainability service is not enabled for your company')
    }
  }, [isEnabled, serviceLoading, navigate])

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['athens-sust-projects'],
    queryFn: () => athensSustainabilityApi.getProjects(),
    enabled: isEnabled,
  })

  const { data: currentProject } = useQuery({
    queryKey: ['athens-sust-current-project'],
    queryFn: () => athensSustainabilityApi.getCurrentProject(),
    enabled: isEnabled,
  })

  const selectProjectMutation = useMutation({
    mutationFn: (projectId: number) => athensSustainabilityApi.selectProject(projectId),
    onSuccess: (data) => {
      // Store in localStorage for persistence
      localStorage.setItem('athens_sust_project_id', data.project_id.toString())
      localStorage.setItem('athens_sust_project_name', data.project_name)
      
      queryClient.invalidateQueries({ queryKey: ['athens-sust-current-project'] })
      toast.success(`Selected project: ${data.project_name}`)
      navigate('/athens-sustainability/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to select project')
    }
  })

  const handleProjectSelect = (projectId: number) => {
    setSelectedProject(projectId)
    selectProjectMutation.mutate(projectId)
  }

  const handleCreateProject = () => {
    navigate('/athens-sustainability/projects/create')
  }

  if (serviceLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isEnabled) {
    return null // Will redirect
  }

  const projectsList = projects?.results || []

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Athens Sustainability Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a project to continue or create a new one
          </p>
        </div>

        {currentProject?.has_active_project && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Current Active Project
                  </h3>
                  <p className="text-green-600 dark:text-green-300">
                    {currentProject.project?.name}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/athens-sustainability/dashboard')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Available Projects ({projectsList.length})
          </h2>
          <Button
            onClick={handleCreateProject}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create New Project
          </Button>
        </div>

        {projectsList.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get started by creating your first Athens Sustainability project
              </p>
              <Button
                onClick={handleCreateProject}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList.map((project) => (
              <Card
                key={project.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedProject === project.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleProjectSelect(project.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {project.category}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {project.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {project.location}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      {project.members_count} members
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm0 0v4m-4-8a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      Deadline: {new Date(project.deadline_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={selectProjectMutation.isPending && selectedProject === project.id}
                    >
                      {selectProjectMutation.isPending && selectedProject === project.id ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-2" />
                          Selecting...
                        </>
                      ) : (
                        'Select Project'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default ProjectSelection