import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download } from 'lucide-react'
import { athensSustCompanyApi, type AnalyticsSeriesResponse } from '../../../services/athensSustCompanyApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import ProjectSwitcher from './ProjectSwitcher'
import AthensServiceGate from './AthensServiceGate'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'

const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
  const header = Object.keys(rows[0] || {})
  const csvContent = [
    header.join(','),
    ...rows.map((row) => header.map((key) => JSON.stringify(row[key] ?? '')).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const isSeriesEmpty = (series?: AnalyticsSeriesResponse) => {
  if (!series) return true
  return Object.values(series.series || {}).every((values) => values.every((value) => value === 0))
}

const AnalyticsPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null)
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')
  const [department, setDepartment] = React.useState<string>('')
  const [orgFilter, setOrgFilter] = React.useState<string>('')
  const { isEnabled } = useAthensSustainabilityEnabled()

  const queryParams = {
    project: selectedProjectId || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    department: department || undefined,
    org: orgFilter || undefined
  }

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['athens-analytics-overview', queryParams],
    queryFn: () => athensSustCompanyApi.analyticsOverview(queryParams),
    enabled: isEnabled
  })

  const { data: permitTrends, isLoading: permitLoading } = useQuery({
    queryKey: ['athens-analytics-permit', queryParams],
    queryFn: () => athensSustCompanyApi.analyticsPermitTrends(queryParams),
    enabled: isEnabled
  })

  const { data: safetyPerformance, isLoading: safetyLoading } = useQuery({
    queryKey: ['athens-analytics-safety', queryParams],
    queryFn: () => athensSustCompanyApi.analyticsSafetyPerformance(queryParams),
    enabled: isEnabled
  })

  const { data: departmentDistribution, isLoading: departmentLoading } = useQuery({
    queryKey: ['athens-analytics-department', queryParams],
    queryFn: () => athensSustCompanyApi.analyticsDepartmentDistribution(queryParams),
    enabled: isEnabled
  })

  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['athens-analytics-metrics', queryParams],
    queryFn: () => athensSustCompanyApi.analyticsPerformanceMetrics(queryParams),
    enabled: isEnabled
  })

  const exportOverview = () => {
    if (!overview) return
    downloadCsv('athens_analytics_overview.csv', [overview])
  }

  return (
    <AthensServiceGate>
      <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Athens Sustainability Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Deep-dive performance metrics across projects and departments.</p>
        </div>
        <ProjectSwitcher onChange={setSelectedProjectId} className="w-full lg:w-64" enabled={isEnabled} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-600">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Department</label>
              <Input placeholder="All" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">EPC / Contractor</label>
              <Select
                value={orgFilter}
                onChange={(value) => setOrgFilter(value)}
                options={[
                  { value: '', label: 'All' },
                  { value: 'EPC', label: 'EPC' },
                  { value: 'CONTRACTOR', label: 'Contractor' }
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {overviewLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" text="Loading analytics..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Permits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{overview?.total_permits ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Safety Observations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{overview?.safety_observations ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{overview?.active_workers ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{overview?.compliance_rate ?? 0}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={exportOverview}>
          <Download className="h-4 w-4 mr-2" /> Export Overview CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Permit Trends</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => {
              if (!permitTrends) return
              const rows = permitTrends.labels.map((label, index) => ({
                label,
                approved: permitTrends.series.approved?.[index] ?? 0,
                pending: permitTrends.series.pending?.[index] ?? 0,
                rejected: permitTrends.series.rejected?.[index] ?? 0
              }))
              downloadCsv('athens_permit_trends.csv', rows)
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {permitLoading ? (
              <LoadingSpinner size="sm" text="Loading chart..." />
            ) : isSeriesEmpty(permitTrends) ? (
              <p className="text-sm text-gray-500">No permit trend data available.</p>
            ) : (
              <div className="space-y-2">
                {permitTrends?.labels.map((label, index) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-gray-500">Approved {permitTrends.series.approved?.[index] ?? 0} | Pending {permitTrends.series.pending?.[index] ?? 0} | Rejected {permitTrends.series.rejected?.[index] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Safety Performance</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => {
              if (!safetyPerformance) return
              const rows = safetyPerformance.labels.map((label, index) => ({
                label,
                observations: safetyPerformance.series.observations?.[index] ?? 0,
                incidents: safetyPerformance.series.incidents?.[index] ?? 0,
                resolved: safetyPerformance.series.resolved?.[index] ?? 0
              }))
              downloadCsv('athens_safety_performance.csv', rows)
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {safetyLoading ? (
              <LoadingSpinner size="sm" text="Loading chart..." />
            ) : isSeriesEmpty(safetyPerformance) ? (
              <p className="text-sm text-gray-500">No safety performance data available.</p>
            ) : (
              <div className="space-y-2">
                {safetyPerformance?.labels.map((label, index) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-gray-500">Obs {safetyPerformance.series.observations?.[index] ?? 0} | Inc {safetyPerformance.series.incidents?.[index] ?? 0} | Res {safetyPerformance.series.resolved?.[index] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Department Distribution</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => {
              if (!departmentDistribution?.data?.length) return
              downloadCsv('athens_department_distribution.csv', departmentDistribution.data)
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {departmentLoading ? (
              <LoadingSpinner size="sm" text="Loading chart..." />
            ) : departmentDistribution?.data?.length ? (
              <div className="space-y-2">
                {departmentDistribution.data.map((item) => (
                  <div key={item.department} className="flex items-center justify-between text-sm">
                    <span>{item.department}</span>
                    <span className="text-gray-500">{item.percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No department data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <LoadingSpinner size="sm" text="Loading metrics..." />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Safety Score', value: performanceMetrics?.safety_score ?? 0 },
                  { label: 'Permit Efficiency', value: performanceMetrics?.permit_efficiency ?? 0 },
                  { label: 'Training Completion', value: performanceMetrics?.training_completion ?? 0 },
                  { label: 'Incident Resolution', value: performanceMetrics?.incident_resolution ?? 0 }
                ].map((metric) => (
                  <div key={metric.label} className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{metric.label}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 bg-gray-200 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${metric.value}%` }} />
                      </div>
                      <span className="text-sm font-semibold">{metric.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </AthensServiceGate>
  )
}

export default AnalyticsPage
