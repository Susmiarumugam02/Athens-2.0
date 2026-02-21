import React, { useState, useEffect } from 'react'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Button } from '../ui/Button'
import type { Subscription } from '../../services/controlPlaneService'

interface EditSubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
  onSave: (id: number, data: Partial<Subscription>) => Promise<void>
}

const PLAN_OPTIONS = [
  { value: 'Starter', label: 'Starter', price: '$49/mo or $490/year' },
  { value: 'Professional', label: 'Professional', price: '$199/mo or $1,990/year' },
  { value: 'Enterprise', label: 'Enterprise', price: '$999/mo or $9,990/year' },
]

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function EditSubscriptionModal({ open, onOpenChange, subscription, onSave }: EditSubscriptionModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    plan_name: '',
    status: 'active',
    valid_from: '',
    valid_until: '',
  })

  useEffect(() => {
    if (subscription) {
      setFormData({
        plan_name: subscription.plan_name,
        status: subscription.status,
        valid_from: subscription.valid_from.split('T')[0],
        valid_until: subscription.valid_until ? subscription.valid_until.split('T')[0] : '',
      })
    }
  }, [subscription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscription) return

    try {
      setLoading(true)
      await onSave(subscription.id, {
        plan_name: formData.plan_name,
        status: formData.status as any,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = PLAN_OPTIONS.find(p => p.value === formData.plan_name)

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <AppDialogTitle>Edit Subscription</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} />
      </AppDialogHeader>
      
      <AppDialogBody>
        <form onSubmit={handleSubmit} className="space-y-4" id="edit-form">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tenant
            </label>
            <input
              type="text"
              value={subscription?.tenant_name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plan *
            </label>
            <select
              value={formData.plan_name}
              onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select plan</option>
              {PLAN_OPTIONS.map(plan => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
            {selectedPlan && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedPlan.price}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid From *
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank for unlimited
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Pricing Guide</h4>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <div className="flex justify-between">
                <span>Starter:</span>
                <span>$49/mo or $490/year</span>
              </div>
              <div className="flex justify-between">
                <span>Professional:</span>
                <span>$199/mo or $1,990/year</span>
              </div>
              <div className="flex justify-between">
                <span>Enterprise:</span>
                <span>$999/mo or $9,990/year</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </AppDialogBody>
    </AppDialog>
  )
}
