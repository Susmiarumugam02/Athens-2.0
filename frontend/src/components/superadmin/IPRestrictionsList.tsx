import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';
import IPRestrictionFormModal from '@/components/superadmin/IPRestrictionFormModal';

interface IPRestriction {
  id: number;
  ip_address: string;
  ip_range: string;
  restriction_type: 'allow' | 'deny';
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function IPRestrictionsList() {
  const [restrictions, setRestrictions] = useState<IPRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadRestrictions();
  }, []);

  const loadRestrictions = async () => {
    try {
      const response = await superadminApi.security.listIPRestrictions();
      setRestrictions(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load IP restrictions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await superadminApi.security.deleteIPRestriction(deleteId);
      toast.success('IP restriction deleted successfully');
      loadRestrictions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete IP restriction');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-400">Manage IP-based access restrictions</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Restriction
        </button>
      </div>

      {restrictions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No IP restrictions configured
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">IP Address/Range</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restrictions.map((restriction) => (
                <tr key={restriction.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {restriction.ip_address || restriction.ip_range}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      restriction.restriction_type === 'allow'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {restriction.restriction_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{restriction.description}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      restriction.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {restriction.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setDeleteId(restriction.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <IPRestrictionFormModal
          open={showAddModal}
          onOpenChange={(v) => setShowAddModal(v)}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadRestrictions();
          }}
        />
      )}

      {deleteId && (
        <ConfirmActionDialog
          open={true}
          title="Delete IP Restriction"
          description="Are you sure you want to delete this IP restriction? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
