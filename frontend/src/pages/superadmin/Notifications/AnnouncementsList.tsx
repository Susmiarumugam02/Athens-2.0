import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, RefreshCw, Bell } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';
import AnnouncementFormModal from '@/components/superadmin/AnnouncementFormModal';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  target_audience: 'all' | 'roles';
  target_roles: number[];
  created_by: number;
  created_by_email: string;
  scheduled_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toggleId, setToggleId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');

  useEffect(() => {
    loadAnnouncements();
  }, [filterType, filterActive]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterActive) params.is_active = filterActive;
      
      const response = await superadminApi.announcements.list(params);
      setAnnouncements(response.data.results || []);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await superadminApi.announcements.delete(deleteId);
      toast.success('Announcement deleted successfully');
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete announcement');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggle = async () => {
    if (!toggleId) return;
    try {
      const response = await superadminApi.announcements.toggleStatus(toggleId);
      toast.success(response.data.message);
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to toggle announcement status');
    } finally {
      setToggleId(null);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowFormModal(true);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingAnnouncement(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadAnnouncements();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/20 text-blue-400';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
        <div className="grid grid-cols-3 gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            onClick={loadAnnouncements}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-gray-400">Showing {announcements.length} announcements</p>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400">No announcements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Audience</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{announcement.title}</div>
                      <div className="text-sm text-gray-400 truncate max-w-md">{announcement.message}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(announcement.type)}`}>
                        {announcement.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm capitalize">{announcement.target_audience}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        announcement.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {announcement.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(announcement.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setToggleId(announcement.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            announcement.is_active
                              ? 'hover:bg-gray-500/20 text-gray-400'
                              : 'hover:bg-green-500/20 text-green-400'
                          }`}
                          title={announcement.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(announcement.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFormModal && (
        <AnnouncementFormModal
          open={showFormModal}
          onOpenChange={setShowFormModal}
          onSuccess={handleSuccess}
          editData={editingAnnouncement ?? undefined}
        />
      )}

      {deleteId && (
        <ConfirmActionDialog
          open={true}
          title="Delete Announcement"
          description="Are you sure you want to delete this announcement? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      )}

      {toggleId && (
        <ConfirmActionDialog
          open={true}
          title={announcements.find(a => a.id === toggleId)?.is_active ? 'Deactivate Announcement' : 'Activate Announcement'}
          description={`Are you sure you want to ${announcements.find(a => a.id === toggleId)?.is_active ? 'deactivate' : 'activate'} this announcement?`}
          confirmText={announcements.find(a => a.id === toggleId)?.is_active ? 'Deactivate' : 'Activate'}
          onConfirm={handleToggle}
          onClose={() => setToggleId(null)}
        />
      )}
    </div>
  );
}
