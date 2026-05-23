import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Search, Filter } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import AuditLogDetailDrawer from '@/components/superadmin/AuditLogDetailDrawer';
import { DataTableShell, TableEmptyState } from '@/components/table';
import { Button } from '@/components/ui/Button';

interface AuditLog {
  id: number;
  timestamp: string;
  user: number | null;
  user_email: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  request_data: any;
  response_data: any;
  status: 'success' | 'failure';
}

interface Stats {
  total_count: number;
  success_count: number;
  failure_count: number;
}

export default function AuditLogsList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    user_id: '',
    module: '',
    action: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    loadLogs();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { ...filters, page };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await superadminApi.auditLogs.list(params);
      setLogs(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const params: Record<string, any> = { ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await superadminApi.auditLogs.getStats(params);
      setStats(response.data);
    } catch (error: any) {
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, any> = { ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await superadminApi.auditLogs.export(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit logs exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      user_id: '',
      module: '',
      action: '',
      status: '',
      search: '',
    });
    setPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Events</div>
            <div className="text-2xl font-semibold">{stats.total_count}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Successful</div>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.success_count}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Failed</div>
            <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats.failure_count}</div>
          </div>
        </div>
      )}

      <DataTableShell
        title="Audit Logs"
        subtitle="Platform activity trail and security events"
        count={`${logs.length} of ${totalCount}`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={loadLogs}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        }
        toolbar={
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                placeholder="Start Date"
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                placeholder="End Date"
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={filters.module}
                onChange={(e) => handleFilterChange('module', e.target.value)}
                placeholder="Module"
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search action, module, resource..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        }
        pagination={
          totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors text-sm"
              >
                Previous
              </button>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors text-sm"
              >
                Next
              </button>
            </div>
          ) : undefined
        }
        emptyState={
          logs.length === 0 && !loading ? (
            <TableEmptyState
              icon={<FileText className="w-12 h-12 text-gray-400" />}
              title="No audit logs found"
              description="Try adjusting your filters"
            />
          ) : null
        }
      >
        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Action</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Module</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Resource</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="py-3 px-4 text-sm">{formatDate(log.timestamp)}</td>
                  <td className="py-3 px-4 text-sm">{log.user_email || 'System'}</td>
                  <td className="py-3 px-4 text-sm font-mono">{log.action}</td>
                  <td className="py-3 px-4 text-sm">{log.module}</td>
                  <td className="py-3 px-4 text-sm">
                    {log.resource_type && (
                      <span className="font-mono text-xs">
                        {log.resource_type}:{log.resource_id}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">{log.ip_address}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTableShell>

      {selectedLog && (
        <AuditLogDetailDrawer
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
