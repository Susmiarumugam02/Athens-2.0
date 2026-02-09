import React from 'react'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Badge } from '../ui/Badge'
import { Building, CreditCard, Calendar, Clock } from 'lucide-react'
import { Subscription } from '../../services/controlPlaneService'

interface ViewSubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
}

const STATUS_VARIANTS = { active: 'success' as const, inactive: 'secondary' as const, suspended: 'warning' as const }

export const ViewSubscriptionModal: React.FC<ViewSubscriptionModalProps> = ({ open, onOpenChange, subscription }) => {
  if (!subscription) return null

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <AppDialogTitle>Subscription Details</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} />
      </AppDialogHeader>
      <AppDialogBody>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subscription.plan_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{subscription.tenant_name}</p>
            </div>
          </div>
          <Badge variant={STATUS_VARIANTS[subscription.status as keyof typeof STATUS_VARIANTS] || 'secondary'}>
            {subscription.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tenant</p>
              <p className="text-sm text-gray-900 dark:text-white">{subscription.tenant_name || `Tenant #${subscription.tenant}`}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
              <p className="text-sm text-gray-900 dark:text-white">{subscription.plan_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
              <p className="text-sm text-gray-900 dark:text-white">{new Date(subscription.start_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </AppDialogBody>
    </AppDialog>
  )
}
