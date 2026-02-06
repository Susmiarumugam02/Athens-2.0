import React, { useEffect, useState } from 'react'
import SuperadminLayout from '../../../layouts/SuperadminLayout'
import { controlPlaneService, AuditLog } from '../../../services/controlPlaneService'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { Download, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    event_type: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.event_type) params.event_type = filters.event_type

      const res = await controlPlaneService.getAuditLogs(params)
      setLogs(res.data)
    } catch (error) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'User', 'Event Type', 'Severity', 'IP Address', 'Timestamp']
    const rows = logs.map(log => [
      log.id,
      log.user_email || 'System',
      log.event_type,
      log.severity,
      log.ip_address,
      new Date(log.created_at).toISOString(),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit logs exported')
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
      INFO: 'success',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'error',
    }
    return <Badge variant={variants[severity] || 'secondary'}>{severity}</Badge>
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-gray-600 dark:text-gray-400">Security and activity logs</p>
          </div>
          <Button onClick={handleExportCSV} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
            <Input
              label="Event Type"
              value={filters.event_type}
              onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
              placeholder="LOGIN, LOGOUT, etc."
            />
            <div className="flex items-end">
              <Button onClick={loadLogs} className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Severity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">IP Address</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {log.user_email || 'System'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{log.event_type}</td>
                      <td className="py-3 px-4">{getSeverityBadge(log.severity)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{log.ip_address}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No audit logs found</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </SuperadminLayout>
  )
}

export default AuditLogsPage
