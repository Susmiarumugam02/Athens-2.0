import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { controlPlaneService } from '../../services/controlPlaneService'

interface DeleteTenantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: { id: number; name: string } | null
  onSuccess: () => void
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({ open, onOpenChange, tenant, onSuccess }) => {
  const [loading, setLoading] = useState(false)

  if (!open || !tenant) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      await controlPlaneService.deleteTenant(tenant.id)
      toast.success('Tenant deleted')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Delete Tenant</h2>
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">Warning: This action cannot be undone</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Deleting tenant <strong>{tenant.name}</strong> will permanently remove all associated data.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? 'Deleting...' : 'Delete Tenant'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
