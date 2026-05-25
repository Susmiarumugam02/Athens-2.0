import { useEffect, useState } from 'react';
import { superadminApi, type SuperAdminUser } from '@/services/superadmin/superadminApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { UserFormModal } from '@/components/superadmin/UserFormModal';
import { SessionsDrawer } from '@/components/superadmin/SessionsDrawer';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';
import { toast } from '@/lib/toast';
import { DataTableShell, TableToolbar, TableEmptyState } from '@/components/table';

const getActionErrorMessage = (err: unknown) => {
  if (!err || typeof err !== 'object') {
    return 'Action failed';
  }

  const response = (err as { response?: { data?: { detail?: unknown } } }).response;
  return typeof response?.data?.detail === 'string' ? response.data.detail : 'Action failed';
};

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  action: () => Promise<void>;
} | null;

export default function UsersList() {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await superadminApi.users.list({
        search,
        page_size: 100,
      });
      setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch {
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (user: SuperAdminUser) => {
    setConfirm({
      open: true,
      title: 'Reset Password',
      description: `Reset password for ${user.email}? A temporary password will be generated.`,
      action: async () => {
        const response = await superadminApi.users.resetPassword(user.id);
        toast.success(`Temporary password: ${response.data.temporary_password}`);
        await loadUsers();
      },
    });
  };

  const handleToggleStatus = (user: SuperAdminUser) => {
    setConfirm({
      open: true,
      title: user.is_active ? 'Disable User' : 'Enable User',
      description: `${user.is_active ? 'Disable' : 'Enable'} ${user.email}?`,
      action: async () => {
        await superadminApi.users.toggleStatus(user.id);
        toast.success(`User ${user.is_active ? 'disabled' : 'enabled'}`);
        await loadUsers();
      },
    });
  };

  const handleDelete = (user: SuperAdminUser) => {
    setConfirm({
      open: true,
      title: 'Delete User',
      description: `Delete ${user.email}? This action cannot be undone.`,
      action: async () => {
        await superadminApi.users.delete(user.id);
        toast.success('User deleted');
        await loadUsers();
      },
    });
  };

  const handleEdit = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  const handleViewSessions = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setSessionsOpen(true);
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (err: unknown) {
      toast.error(getActionErrorMessage(err));
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (user: SuperAdminUser) => (
        <div>
          <div className="font-medium">{user.email}</div>
          <div className="text-sm text-gray-500">
            {user.roles.map(r => r.name).join(', ') || 'No roles'}
          </div>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (user: SuperAdminUser) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            user.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'requires_2fa',
      header: '2FA',
      render: (user: SuperAdminUser) => (
        <span>{user.requires_2fa ? 'Enabled' : 'Disabled'}</span>
      ),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (user: SuperAdminUser) => (
        <span className="text-sm">
          {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: SuperAdminUser) => (
        <DropdownMenu trigger={
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          }>
          <DropdownMenuItem onClick={() => handleEdit(user)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleResetPassword(user)}>Reset Password</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
            {user.is_active ? 'Disable' : 'Enable'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleViewSessions(user)}>View Sessions</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(user)} variant="danger">Delete</DropdownMenuItem>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTableShell
        title="Users"
        subtitle="Manage SuperAdmin users"
        count={users?.length || 0}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        }
        toolbar={
          <TableToolbar
            left={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            }
          />
        }
        emptyState={
          error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                Retry
              </Button>
            </div>
          ) : users.length === 0 && !loading ? (
            <TableEmptyState title="No users found" description="Get started by adding your first user" />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
        />
      </DataTableShell>

      <UserFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadUsers}
      />

      <UserFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadUsers}
        editData={selectedUser ?? undefined}
      />

      {selectedUser && (
        <SessionsDrawer
          open={sessionsOpen}
          userId={selectedUser.id}
          onClose={() => {
            setSessionsOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={(msg) => toast.success(msg ?? 'Success')}
          onError={(msg) => toast.error(msg ?? 'Error')}
        />
      )}

      {confirm && (
        <ConfirmActionDialog
          open={confirm.open}
          title={confirm.title}
          description={confirm.description}
          isLoading={confirmLoading}
          onConfirm={executeConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
