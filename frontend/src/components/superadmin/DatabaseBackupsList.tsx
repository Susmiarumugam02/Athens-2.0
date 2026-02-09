import { useState, useEffect } from 'react';
import { Plus, Download, RotateCcw, RefreshCw, Database } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';

interface DatabaseBackup {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  backup_type: string;
  status: string;
  error_message: string | null;
  created_by: number;
  created_by_email: string;
  created_at: string;
  completed_at: string | null;
}

export default function DatabaseBackupsList() {
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await superadminApi.backups.list();
      setBackups(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await superadminApi.backups.create();
      toast.success('Backup created successfully');
      loadBackups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create backup');
    } finally {
      setCreating(false);
      setShowCreateConfirm(false);
    }
  };

  const handleDownload = async (backup: DatabaseBackup) => {
    try {
      const response = await superadminApi.backups.download(backup.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Backup downloaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download backup');
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      await superadminApi.backups.restore(restoreId);
      toast.success('Database restored successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to restore database');
    } finally {
      setRestoreId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-400">Manage database backups and restore points</p>
        <button
          onClick={() => setShowCreateConfirm(true)}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-red-400 font-semibold mb-1">Restore Warning</div>
            <div className="text-red-300 text-sm">
              Restoring a backup will overwrite the current database state. This action cannot be undone. 
              Always create a fresh backup before restoring.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : backups.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">No backups found</p>
          <p className="text-sm text-gray-500 mt-2">Create your first backup to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Filename</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Size</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created By</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created At</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 text-white font-mono text-sm">{backup.filename}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{formatFileSize(backup.file_size)}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm capitalize">{backup.backup_type}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      backup.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : backup.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {backup.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{backup.created_by_email}</td>
                  <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(backup.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(backup)}
                        disabled={backup.status !== 'completed'}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 disabled:text-gray-600 disabled:hover:bg-transparent rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRestoreId(backup.id)}
                        disabled={backup.status !== 'completed'}
                        className="p-2 hover:bg-yellow-500/20 text-yellow-400 disabled:text-gray-600 disabled:hover:bg-transparent rounded-lg transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={loadBackups}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {showCreateConfirm && (
        <ConfirmActionDialog
          open={true}
          title="Create Database Backup"
          description="This will create a full backup of the current database. The backup process may take a few minutes depending on database size. Continue?"
          confirmText="Create Backup"
          onConfirm={handleCreate}
          onClose={() => setShowCreateConfirm(false)}
        />
      )}

      {restoreId && (
        <ConfirmActionDialog
          open={true}
          title="Restore Database"
          description="⚠️ WARNING: This will overwrite the current database with the selected backup. All current data will be replaced. This action CANNOT be undone. Are you absolutely sure you want to proceed?"
          confirmText="Restore Database"
          onConfirm={handleRestore}
          onClose={() => setRestoreId(null)}
        />
      )}
    </div>
  );
}
