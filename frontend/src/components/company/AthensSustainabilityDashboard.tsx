import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Users, Calendar, TrendingUp, AlertCircle, Activity, Leaf } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { athensSustainabilityApi } from '../../services/athensSustainabilityApi'

interface AthensSustainabilityDashboardProps {
  onNavigateToTab?: (tab: string) => void
}

const AthensSustainabilityDashboard: React.FC<AthensSustainabilityDashboardProps> = () => {
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['athens-sust-dashboard-overview'],
    queryFn: () => athensSustainabilityApi.getDashboardOverview(),
    enabled: isEnabled,
    refetchInterval: 30000
  })

  if (serviceLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading Athens Sustainability dashboard..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-orange-200/50 dark:border-orange-700/50">
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

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2 flex items-center space-x-2">
          <Leaf className="h-6 w-6" />
          <span>Athens Sustainability Module</span>
        </h1>
        <p className="text-green-100">Manage your sustainability projects and environmental initiatives</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardData?.total_projects || 0}</div>
            <p className="text-xs text-muted-foreground">Sustainability initiatives</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData?.active_projects || 0}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{dashboardData?.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">Team members involved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Categories */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-green-500" />
              <span>Project Categories</span>
            </CardTitle>
            <CardDescription>Distribution of projects by category</CardDescription>
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

        {/* Upcoming Deadlines */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Upcoming Deadlines</span>
            </CardTitle>
            <CardDescription>Projects with approaching deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.upcoming_deadlines && dashboardData.upcoming_deadlines.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcoming_deadlines.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="h-2 w-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {new Date(project.deadline_date).toLocaleDateString()}
                        </p>
                      </div>
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
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>Latest project updates and changes</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
            <div className="space-y-4">
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
  )
}

export default AthensSustainabilityDashboard