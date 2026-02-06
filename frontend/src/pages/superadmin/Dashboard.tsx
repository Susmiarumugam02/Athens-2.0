import React, { useEffect, useState } from 'react'
import SuperadminLayout from '../../layouts/SuperadminLayout'
import { controlPlaneService, type AuditLog } from '../../services/controlPlaneService'
import { Card } from '../../components/ui/Card'
import { Building2, CreditCard, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

const SuperadminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
  })
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [tenantsRes, subsRes, logsRes] = await Promise.all([
        controlPlaneService.getTenants(),
        controlPlaneService.getSubscriptions(),
        controlPlaneService.getAuditLogs(),
      ])

      const tenants = tenantsRes.data
      const subscriptions = subsRes.data
      const logs = logsRes.data

      setStats({
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.is_active).length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
      })

      setRecentLogs(logs.slice(0, 10))
    } catch (error: any) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Tenants', value: stats.totalTenants, icon: Building2, color: 'blue' },
    { label: 'Active Tenants', value: stats.activeTenants, icon: Building2, color: 'green' },
    { label: 'Total Subscriptions', value: stats.totalSubscriptions, icon: CreditCard, color: 'purple' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'green' },
  ]

  if (loading) {
    return (
      <SuperadminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </SuperadminLayout>
    )
  }

  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Plane Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-foreground/80">{stat.label}</p>
                    <p className="text-3xl font-bold text-primary-foreground mt-2">{stat.value}</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 mr-2 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{log.event_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.user_email || 'System'} • {log.ip_address}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </SuperadminLayout>
  )
}

export default SuperadminDashboard
