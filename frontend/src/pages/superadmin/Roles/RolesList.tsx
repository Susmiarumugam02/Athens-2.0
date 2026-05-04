import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { superadminApi, type Role, type Permission } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';
import { RoleFormModal } from '@/components/superadmin/RoleFormModal';
import { PermissionMatrix } from '@/components/superadmin/PermissionMatrix';
import { Modal } from '@/components/ui/Modal';
import { DataTableShell, TableToolbar, TableEmptyState } from '@/components/table';
import { Search, RefreshCw } from 'lucide-react';

export default function RolesList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superadminApi.roles.list();
      const data: Role[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.results ?? []);
      setRoles(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    setLoadingPerms(true);
    try {
      const res = await superadminApi.permissions.list();
      const data: Permission[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.results ?? []);
      setAllPermissions(data);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPerms(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(q));
  }, [roles, query]);

  const openEdit = (r: Role) => {
    setSelectedRole(r);
    setEditOpen(true);
  };

  const openPermissions = async (r: Role) => {
    setSelectedRole(r);
    if (allPermissions.length === 0) await loadPermissions();
    setPermOpen(true);
  };

  const askDelete = (r: Role) => {
    setSelectedRole(r);
    setConfirmDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!selectedRole) return;
    setDeleting(true);
    try {
      await superadminApi.roles.delete(selectedRole.id);
      toast.success('Role deleted');
      setConfirmDeleteOpen(false);
      setSelectedRole(null);
      await loadRoles();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Delete failed (role may be protected or assigned to users)');
    } finally {
      setDeleting(false);
    }
  };

  const savePermissions = async (permissionIds: number[]) => {
    if (!selectedRole) return;
    try {
      await superadminApi.roles.assignPermissions(selectedRole.id, permissionIds);
      toast.success('Permissions updated');
      setPermOpen(false);
      await loadRoles();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Failed to update permissions');
    }
  };

  return (
    <>
      <DataTableShell
        title="Roles & Permissions"
        subtitle="Create roles and assign permissions"
        count={filtered?.length || 0}
        actions={
          <Button onClick={() => setCreateOpen(true)}>Create Role</Button>
        }
        toolbar={
          <TableToolbar
            left={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search roles..."
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            }
            right={
              <Button variant="outline" onClick={loadRoles} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            }
          />
        }
        emptyState={
          error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={loadRoles}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <TableEmptyState title="No roles found" description="Create your first role to get started" />
          ) : null
        }
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Permissions</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {r.is_system_role && (
                        <span className="text-xs rounded-full border px-2 py-0.5 text-gray-600 dark:text-gray-400">
                          System
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{r.description || '-'}</td>
                  <td className="p-3">
                    {(r.permissions?.length ?? 0) > 0 ? `${r.permissions!.length} assigned` : '0 assigned'}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPermissions(r)}>
                        Permissions
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => askDelete(r)}
                        disabled={r.is_system_role}
                        title={r.is_system_role ? 'System roles cannot be deleted' : 'Delete role'}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTableShell>

      <RoleFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadRoles}
      />

      <RoleFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadRoles}
        editData={selectedRole ?? undefined}
      />

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        title="Delete role?"
        description={
          selectedRole?.is_system_role
            ? 'System roles cannot be deleted.'
            : 'This action cannot be undone. If users are assigned to this role, deletion will be blocked.'
        }
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />

      <Modal isOpen={permOpen} onClose={() => setPermOpen(false)} title={`Manage Permissions — ${selectedRole?.name ?? ''}`}>
        {loadingPerms ? (
          <div className="rounded-md border p-4 text-sm text-gray-500">Loading permissions...</div>
        ) : (
          <PermissionMatrix
            permissions={allPermissions}
            initialSelectedIds={(selectedRole?.permissions ?? []).map((p) => p.id)}
            onSave={savePermissions}
            onClose={() => setPermOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
