import React, { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { athensSustainabilityApi } from '../../../services/athensSustainabilityApi'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'
import AthensLayout from './AthensLayout'
import EmployeesPage from './EmployeesPage'
import toast from 'react-hot-toast'
import { Briefcase, Users, Calendar, TrendingUp, Activity, Leaf } from 'lucide-react'

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate()
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()

  // Check if user has an active project
  const { data: currentProject, isLoading: projectLoading } = useQuery({
    queryKey: ['athens-sust-current-project'],
    queryFn: () => athensSustainabilityApi.getCurrentProject(),
    enabled: isEnabled,
  })

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['athens-sust-dashboard'],
    queryFn: () => athensSustainabilityApi.getDashboardOverview(),
    enabled: isEnabled && currentProject?.has_active_project,
  })

  // Redirect if service not enabled
  useEffect(() => {
    if (!serviceLoading && !isEnabled) {
      navigate('/dashboard')
      toast.error('Athens Sustainability service is not enabled for your company')
    }
  }, [isEnabled, serviceLoading, navigate])

  // Redirect to project selection if no active project
  useEffect(() => {
    if (!projectLoading && currentProject && !currentProject.has_active_project) {
      navigate('/athens-sustainability/projects')
      toast('Please select a project to continue')
    }
  }, [currentProject, projectLoading, navigate])

  if (serviceLoading || projectLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isEnabled || !currentProject?.has_active_project) {
    return null // Will redirect
  }

  const handleSwitchProject = () => {
    navigate('/athens-sustainability/projects')
  }

  const handleManageProjects = () => {
    navigate('/athens-sustainability/projects/manage')
  }

  const handleManageMembers = () => {
    navigate('/athens-sustainability/projects/members')
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1 flex items-center space-x-2">
              <Leaf className="h-5 w-5" />
              <span>Athens Sustainability Dashboard</span>
            </h1>
            <p className="text-green-100 text-sm">
              Current Project: <span className="font-semibold">{currentProject.project?.name}</span>
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleSwitchProject}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm text-sm px-3 py-1.5"
            >
              Switch Project
            </Button>
          </div>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Total Projects</CardTitle>
                <Briefcase className="h-3 w-3 text-blue-600" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl font-bold text-blue-600">{dashboardData?.total_projects || 0}</div>
                <p className="text-xs text-muted-foreground">Sustainability initiatives</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Active Projects</CardTitle>
                <TrendingUp className="h-3 w-3 text-green-600" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl font-bold text-green-600">{dashboardData?.active_projects || 0}</div>
                <p className="text-xs text-muted-foreground">Currently in progress</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Total Members</CardTitle>
                <Users className="h-3 w-3 text-purple-600" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl font-bold text-purple-600">{dashboardData?.total_members || 0}</div>
                <p className="text-xs text-muted-foreground">Team members involved</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium">Upcoming Deadlines</CardTitle>
                <Calendar className="h-3 w-3 text-orange-600" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-xl font-bold text-orange-600">{dashboardData?.upcoming_deadlines?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Approaching deadlines</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Categories */}
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  <span>Project Categories</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.project_categories && Object.keys(dashboardData.project_categories).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(dashboardData.project_categories).map(([category, count], index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500']
                      const color = colors[index % colors.length]
                      return (
                        <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${color}`}></div>
                            <span className="text-sm font-medium capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {count} project{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No project categories</p>
                    <p className="text-xs text-gray-400">Categories will appear as you create projects</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleManageProjects}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  Manage Projects
                </Button>
                <Button
                  onClick={handleManageMembers}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Manage Members
                </Button>
                <Button
                  onClick={handleSwitchProject}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Switch Project
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <span>Upcoming Deadlines</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.upcoming_deadlines && dashboardData.upcoming_deadlines.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.upcoming_deadlines.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="h-2 w-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Due: {new Date(project.deadline_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No upcoming deadlines</p>
                    <p className="text-xs text-gray-400">Deadlines will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span>Recent Activities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recent_activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Project <strong>{activity.name}</strong> was updated
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                    <p className="text-xs text-gray-400">Activity will appear here as you work on projects</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

const Dashboard: React.FC = () => {
  return (
    <AthensLayout>
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/employees" element={<EmployeesPage />} />
      </Routes>
    </AthensLayout>
  )
}

export default Dashboard