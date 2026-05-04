import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Briefcase, Users, Settings } from 'lucide-react'
import { athensSustCompanyApi } from '../../../services/athensSustCompanyApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { Button } from '../../ui/Button'
import ProjectSwitcher from './ProjectSwitcher'
import AthensServiceGate from './AthensServiceGate'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'

interface OverviewPageProps {
  onNavigate?: (tabId: string) => void
}

const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null)
  const { isEnabled } = useAthensSustainabilityEnabled()

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['athens-overview', selectedProjectId],
    queryFn: () => athensSustCompanyApi.analyticsOverview({ project: selectedProjectId || undefined }),
    enabled: isEnabled
  })

  const { data: moduleConfigs, isLoading: modulesLoading } = useQuery({
    queryKey: ['athens-modules', selectedProjectId],
    queryFn: () => athensSustCompanyApi.getProjectModules(selectedProjectId || undefined),
    enabled: isEnabled
  })

  const enabledModules = (moduleConfigs || []).filter((module) => module.enabled)

  return (
    <AthensServiceGate>
      <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Athens Sustainability Overview</h2>
          <p className="text-gray-600 dark:text-gray-400">Portfolio-wide snapshot across projects and modules.</p>
        </div>
        <ProjectSwitcher onChange={setSelectedProjectId} className="w-full lg:w-64" enabled={isEnabled} />
      </div>

      {overviewLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading overview..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Total Permits
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">
                {overview?.total_permits ?? 0}
              </div>
              <p className="text-sm text-gray-500">Across selected scope</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Safety Observations
                <BarChart3 className="h-5 w-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">
                {overview?.safety_observations ?? 0}
              </div>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Workers
                <Users className="h-5 w-5 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">
                {overview?.active_workers ?? 0}
              </div>
              <p className="text-sm text-gray-500">Current workforce</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Compliance Rate
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">
                {overview?.compliance_rate ?? 0}%
              </div>
              <p className="text-sm text-gray-500">Rolling compliance</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Module Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <LoadingSpinner size="sm" text="Loading modules..." />
            ) : enabledModules.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enabledModules.map((module) => (
                  <div key={module.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-sm uppercase tracking-wide text-gray-500">{module.module_key}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Enabled</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No modules enabled yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('athens-projects')}>
                <Briefcase className="h-4 w-4 mr-2" />
                Create Project
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('athens-admin-users')}>
                <Users className="h-4 w-4 mr-2" />
                Create Employee
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate?.('athens-menu-management')}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Modules
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No recent activity.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No alerts at the moment.</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </AthensServiceGate>
  )
}

export default OverviewPage
