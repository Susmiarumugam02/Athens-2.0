import React from 'react'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Badge } from '../ui/Badge'
import { User, Mail, Phone, Briefcase, Building, Globe, Clock, Calendar } from 'lucide-react'
import { MasterAdmin } from '../../services/controlPlaneService'

interface ViewMasterAdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  master: MasterAdmin | null
}

const ROLE_LABELS = { admin: 'Administrator', manager: 'Manager', viewer: 'Viewer' }
const LANG_LABELS = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi' }

export const ViewMasterAdminModal: React.FC<ViewMasterAdminModalProps> = ({ open, onOpenChange, master }) => {
  if (!master) return null

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <AppDialogTitle>Master Admin Details</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} />
      </AppDialogHeader>
      <AppDialogBody>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {master.first_name || master.last_name ? `${master.first_name || ''} ${master.last_name || ''}`.trim() : master.email}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{master.tenant_name}</p>
            </div>
          </div>
          <Badge variant={master.is_active ? 'success' : 'secondary'}>{master.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm text-gray-900 dark:text-white">{master.email}</p>
            </div>
          </div>
          {master.phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm text-gray-900 dark:text-white">{master.phone}</p>
              </div>
            </div>
          )}
          {master.designation && (
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Designation</p>
                <p className="text-sm text-gray-900 dark:text-white">{master.designation}</p>
              </div>
            </div>
          )}
          {master.department && (
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                <p className="text-sm text-gray-900 dark:text-white">{master.department}</p>
              </div>
            </div>
          )}
          {master.role && (
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-sm text-gray-900 dark:text-white">{ROLE_LABELS[master.role as keyof typeof ROLE_LABELS] || master.role}</p>
              </div>
            </div>
          )}
          {master.timezone && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Timezone</p>
                <p className="text-sm text-gray-900 dark:text-white">{master.timezone}</p>
              </div>
            </div>
          )}
          {master.language && (
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Language</p>
                <p className="text-sm text-gray-900 dark:text-white">{LANG_LABELS[master.language as keyof typeof LANG_LABELS] || master.language}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm text-gray-900 dark:text-white">{new Date(master.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        {master.notes && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-900 dark:text-white">{master.notes}</p>
          </div>
        )}
      </AppDialogBody>
    </AppDialog>
  )
}
