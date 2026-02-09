import React, { useState } from 'react'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Button } from '../ui/Button'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { controlPlaneService, Tenant } from '../../services/controlPlaneService'

interface DeleteTenantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
  onSuccess: () => void
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({ open, onOpenChange, tenant, onSuccess }) => {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!tenant) return
    try {
      setLoading(true)
      await controlPlaneService.deleteTenant(tenant.id)
      toast.success('Tenant deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="sm">
      <AppDialogHeader>
        <AppDialogTitle>Delete Tenant</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={loading} />
      </AppDialogHeader>
      <AppDialogBody>
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-200">Warning: This action cannot be undone</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Deleting tenant <strong>{tenant?.name}</strong> will permanently remove all associated data.
            </p>
          </div>
        </div>
      </AppDialogBody>
      <AppDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="outline" onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
          {loading ? 'Deleting...' : 'Delete Tenant'}
        </Button>
      </AppDialogFooter>
    </AppDialog>
  )
}
