import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Checkbox } from '../ui/Checkbox'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface AthensSettingsProps {
  onNavigateToTab?: (tab: string) => void
}

const AthensSettings: React.FC<AthensSettingsProps> = () => {
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState({
    company_name: '',
    contact_email: '',
    notification_enabled: true,
    auto_approval: false,
    project_deadline_alerts: true,
    member_activity_notifications: true
  })

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['athens-sust-settings'],
    queryFn: () => apiClient.get('/api/athens-sust/settings/'),
    enabled: isEnabled
  })

  useEffect(() => {
    if (settingsData?.data) {
      setSettings(prev => ({ ...prev, ...settingsData.data }))
    }
  }, [settingsData])

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/athens-sust/settings/', data),
    onSuccess: () => {
      toast.success('Settings updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-sust-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings')
    }
  })

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings)
  }

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (serviceLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">
                Athens Sustainability Service Not Available
              </h3>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Your company does not have access to Athens Sustainability service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Athens Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure Athens Sustainability settings for your company
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Basic company information for Athens Sustainability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="Enter contact email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notification_enabled"
                checked={settings.notification_enabled}
                onCheckedChange={(checked) => handleInputChange('notification_enabled', checked)}
              />
              <Label htmlFor="notification_enabled">Enable Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="project_deadline_alerts"
                checked={settings.project_deadline_alerts}
                onCheckedChange={(checked) => handleInputChange('project_deadline_alerts', checked)}
              />
              <Label htmlFor="project_deadline_alerts">Project Deadline Alerts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="member_activity_notifications"
                checked={settings.member_activity_notifications}
                onCheckedChange={(checked) => handleInputChange('member_activity_notifications', checked)}
              />
              <Label htmlFor="member_activity_notifications">Member Activity Notifications</Label>
            </div>
          </CardContent>
        </Card>

        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Settings</CardTitle>
            <CardDescription>
              Configure approval workflow preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_approval"
                checked={settings.auto_approval}
                onCheckedChange={(checked) => handleInputChange('auto_approval', checked)}
              />
              <Label htmlFor="auto_approval">Enable Auto-Approval</Label>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              When enabled, certain actions will be automatically approved without manual review.
            </p>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Athens Sustainability service information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Service Status</Label>
              <p className="text-green-600 dark:text-green-400 font-medium">Active</p>
            </div>
            <div>
              <Label>Service Type</Label>
              <p className="text-gray-900 dark:text-white">Athens Sustainability</p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-gray-600 dark:text-gray-400">
                {settingsData?.data?.updated_at 
                  ? new Date(settingsData.data.updated_at).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AthensSettings