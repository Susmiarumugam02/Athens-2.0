import React from 'react'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Building, Mail, Phone, Globe, Clock, Calendar } from 'lucide-react'
import { Tenant } from '../../services/controlPlaneService'

interface ViewTenantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
}

export const ViewTenantModal: React.FC<ViewTenantModalProps> = ({ open, onOpenChange, tenant }) => {
  if (!tenant) return null

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title="Tenant Details">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.code}</p>
            </div>
          </div>
          <Badge variant={tenant.is_active ? 'success' : 'secondary'}>
            {tenant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {tenant.admin_email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin Email</p>
                <p className="text-sm text-gray-900 dark:text-white">{tenant.admin_email}</p>
              </div>
            </div>
          )}
          {tenant.contact_phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contact Phone</p>
                <p className="text-sm text-gray-900 dark:text-white">{tenant.contact_phone}</p>
              </div>
            </div>
          )}
          {tenant.industry && (
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Industry</p>
                <p className="text-sm text-gray-900 dark:text-white">{tenant.industry}</p>
              </div>
            </div>
          )}
          {tenant.timezone && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Timezone</p>
                <p className="text-sm text-gray-900 dark:text-white">{tenant.timezone}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">{new Date(tenant.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
