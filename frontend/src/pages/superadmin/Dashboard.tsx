import { useEffect, useState } from 'react';
import { superadminApi, type DashboardStats } from '@/services/superadmin/superadminApi';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { Users, Activity, Shield, AlertTriangle } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        superadminApi.dashboard.getStats(),
        superadminApi.dashboard.getActivity(10),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SuperAdmin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">System overview and recent activity</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Users"
            value={stats?.total_users || 0}
            icon={Users}
            variant="primary"
          />
          <KPICard
            label="Active Sessions"
            value={stats?.active_sessions || 0}
            icon={Activity}
            variant="success"
          />
          <KPICard
            label="Recent Activity"
            value={stats?.recent_activity_count || 0}
            icon={Shield}
            variant="primary"
          />
          <KPICard
            label="Failed Logins"
            value={stats?.failed_logins || 0}
            icon={AlertTriangle}
            variant={stats?.failed_logins && stats.failed_logins > 10 ? 'warning' : 'warning'}
          />
        </div>

        {/* Recent Activity */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                activity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.user_email}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {log.action}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {log.module} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
  );
}
