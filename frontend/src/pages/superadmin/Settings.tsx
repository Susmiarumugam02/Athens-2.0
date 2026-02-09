import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Shield, Lock, Key, Eye, EyeOff, RefreshCw, Copy, Download, 
  AlertTriangle, CheckCircle2, Activity, Clock, Fingerprint,
  Smartphone, QrCode,
  Zap, TrendingUp, Globe, 
  User, Mail, Calendar, Settings, Save
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { QRCodeSVG } from 'qrcode.react'
import IPRestrictionManager from '../../components/security/IPRestrictionManager'
import DeviceFingerprintManager from '../../components/security/DeviceFingerprintManager'
import LoginNotificationSettings from '../../components/security/LoginNotificationSettings'
import CaptchaSettings from '../../components/security/CaptchaSettings'

// Ultra-secure password validation
const ultraSecurePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(16, 'Password must be at least 16 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain special character'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

const apiKeySchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
})

const recoveryCodesSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
})

const twoFactorSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  totp_code: z.string().optional(),
})

type UltraSecurePasswordFormData = z.infer<typeof ultraSecurePasswordSchema>
type ApiKeyFormData = z.infer<typeof apiKeySchema>
type RecoveryCodesFormData = z.infer<typeof recoveryCodesSchema>
type TwoFactorFormData = z.infer<typeof twoFactorSchema>

const UltraSecureMasterAdminSettings: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    email: false
  })
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState<string[] | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  
  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    provider: 'gmail',
    email_address: '',
    email_password: '',
    from_name: 'SAP System Security',
    is_active: false
  })
  const [testEmail, setTestEmail] = useState('')
  
  // Phase 3: Enhanced Security State
  const [securitySettings, setSecuritySettings] = useState({
    ip_restrictions_enabled: false,
    device_fingerprinting_enabled: false,
    login_notifications_enabled: false,
    captcha_after_failed_attempts: 3,
    max_failed_attempts: 5,
    lockout_duration_minutes: 15
  })

  // Fetch ultra-secure settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['master-admin-ultra-settings'],
    queryFn: () => apiClient.getMasterAdminUltraSettings(),
  })

  // Fetch 2FA status separately to handle pending setup
  const { data: twoFactorStatus, refetch: refetchTwoFactor } = useQuery({
    queryKey: ['master-admin-two-factor'],
    queryFn: () => apiClient.getMasterAdminTwoFactor(),
  })

  // Set QR code URL from 2FA status if pending setup
  React.useEffect(() => {
    if (twoFactorStatus?.data?.pending_setup && twoFactorStatus?.data?.qr_code_url) {
      setQrCodeUrl(twoFactorStatus.data.qr_code_url)
    }
  }, [twoFactorStatus])

  // Debug logging
  React.useEffect(() => {
    if (settings?.data) {
      console.log('🔍 DEBUG: Settings data:', settings.data)
      console.log('🔍 DEBUG: Security features:', settings.data.security_features)
      console.log('🔍 DEBUG: 2FA status:', settings.data.security_features?.two_factor_authentication)
      console.log('🔍 DEBUG: Recovery codes count:', settings.data.security_stats?.recovery_codes_count)
    }
  }, [settings])

  const { data: securityStatus } = useQuery({
    queryKey: ['master-admin-security-status'],
    queryFn: () => apiClient.getMasterAdminSecurityStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: securityLog } = useQuery({
    queryKey: ['master-admin-security-log'],
    queryFn: () => apiClient.getMasterAdminSecurityLog(),
  })

  // Fetch master admin profile for password expiry
  const { data: masterAdminProfile } = useQuery({
    queryKey: ['master-admin-profile'],
    queryFn: () => apiClient.getMasterAdminProfile(),
    enabled: true,
    staleTime: 0,
  })

  // Phase 3: Enhanced Security Queries
  const { data: enhancedSecuritySettings } = useQuery({
    queryKey: ['enhanced-security-settings'],
    queryFn: () => apiClient.getSecuritySettings()
  })

  // Update security settings when data is fetched
  React.useEffect(() => {
    if (enhancedSecuritySettings?.data) {
      setSecuritySettings(enhancedSecuritySettings.data)
    }
  }, [enhancedSecuritySettings])

  const { data: ipRestrictions } = useQuery({
    queryKey: ['ip-restrictions'],
    queryFn: () => apiClient.getIPRestrictions()
  })

  const { data: deviceFingerprints } = useQuery({
    queryKey: ['device-fingerprints'],
    queryFn: () => apiClient.getDeviceFingerprints()
  })

  const { data: loginNotifications } = useQuery({
    queryKey: ['login-notifications'],
    queryFn: () => apiClient.getLoginNotifications()
  })

  // Email Settings Queries
  const { data: masterAdminEmailSettings } = useQuery({
    queryKey: ['master-admin-email-settings'],
    queryFn: () => apiClient.getMasterAdminEmailSettings()
  })

  // Removed unused emailProviders query

  const { data: emailUsage } = useQuery({
    queryKey: ['email-usage'],
    queryFn: () => apiClient.getMasterAdminEmailUsage()
  })

  // Update email settings when data is fetched (like Company Dashboard)
  React.useEffect(() => {
    if (masterAdminEmailSettings?.data) {
      // Merge with existing settings like Company Dashboard does
      setEmailSettings(prevSettings => ({
        ...prevSettings,
        ...masterAdminEmailSettings.data
      }))
    }
  }, [masterAdminEmailSettings])

  // Forms
  const passwordForm = useForm<UltraSecurePasswordFormData>({
    resolver: zodResolver(ultraSecurePasswordSchema),
  })

  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  })

  const recoveryCodesForm = useForm<RecoveryCodesFormData>({
    resolver: zodResolver(recoveryCodesSchema),
  })

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  })

  // Mutations
  const changePasswordMutation = useMutation({
    mutationFn: (data: UltraSecurePasswordFormData) => 
      apiClient.changeMasterAdminUltraPassword(data),
    onSuccess: () => {
      toast.success('🛡️ Password changed with military-grade security!')
      passwordForm.reset()
      // Force refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-profile'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-security-status'] })
      queryClient.refetchQueries({ queryKey: ['master-admin-profile'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password')
    },
  })

  const regenerateApiKeyMutation = useMutation({
    mutationFn: (data: ApiKeyFormData) => 
      apiClient.regenerateMasterAdminApiKey(data),
    onSuccess: (response) => {
      setGeneratedApiKey(response.data.new_api_key)
      toast.success('🔑 Ultra-secure API key regenerated!')
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate API key')
    },
  })

  const regenerateRecoveryCodesMutation = useMutation({
    mutationFn: (data: RecoveryCodesFormData) => 
      apiClient.regenerateMasterAdminRecoveryCodes(data),
    onSuccess: (response) => {
      setGeneratedRecoveryCodes(response.data.recovery_codes)
      toast.success('🆘 Recovery codes regenerated!')
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate recovery codes')
    },
  })

  const toggleTwoFactorMutation = useMutation({
    mutationFn: (data: TwoFactorFormData & { action: 'enable' | 'disable' | 'reset' }) => 
      apiClient.toggleMasterAdminTwoFactor(data),
    onSuccess: (response, variables) => {
      if (variables.action === 'enable') {
        if (response.data.pending_verification) {
          setQrCodeUrl(response.data.qr_code_url)
          toast.success('📱 Scan QR code with your authenticator app')
        } else if (response.data.two_factor_enabled) {
          toast.success('🔐 Two-factor authentication enabled!')
          setQrCodeUrl(null)
          twoFactorForm.reset()
        }
      } else if (variables.action === 'disable') {
        toast.success('2FA disabled')
        setQrCodeUrl(null)
      } else if (variables.action === 'reset') {
        toast.success('2FA setup reset')
        setQrCodeUrl(null)
      }
      // Force refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-two-factor'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-security-status'] })
      refetchTwoFactor()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to toggle 2FA')
    },
  })

  // Phase 3: Enhanced Security Mutations
  const updateSecuritySettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateSecuritySettings(data),
    onSuccess: () => {
      toast.success('Security settings updated!')
      queryClient.invalidateQueries({ queryKey: ['enhanced-security-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings')
    }
  })

  const addIPRestrictionMutation = useMutation({
    mutationFn: (data: { ip_address: string; description: string }) => 
      apiClient.addIPRestriction(data),
    onSuccess: () => {
      toast.success('IP address added successfully!')
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add IP address')
    }
  })

  const removeIPRestrictionMutation = useMutation({
    mutationFn: (id: number) => apiClient.removeIPRestriction(id),
    onSuccess: () => {
      toast.success('IP address removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove IP address')
    }
  })

  const toggleIPRestrictionMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      apiClient.toggleIPRestriction(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update IP restriction')
    }
  })

  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => apiClient.removeDeviceFingerprint(deviceId),
    onSuccess: () => {
      toast.success('Device removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['device-fingerprints'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove device')
    }
  })

  const toggleDeviceTrustMutation = useMutation({
    mutationFn: ({ deviceId, is_trusted }: { deviceId: string; is_trusted: boolean }) => 
      apiClient.toggleDeviceTrust(deviceId, { is_trusted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-fingerprints'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update device trust')
    }
  })

  // Email Settings Mutations
  const updateEmailSettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateMasterAdminEmailSettings(data),
    onSuccess: (response) => {
      toast.success('Email settings saved successfully!')
      console.log('🎉 Save response:', response)
      
      // Update local state with saved data (like Company Dashboard)
      if (response?.data) {
        setEmailSettings(prevSettings => ({
          ...prevSettings,
          ...response.data
        }))
      }
      
      // Refresh usage stats
      queryClient.invalidateQueries({ queryKey: ['email-usage'] })
    },
    onError: (error: any) => {
      console.error('❌ Save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save email settings')
    }
  })

  const testEmailMutation = useMutation({
    mutationFn: (data: { test_email?: string }) => apiClient.testMasterAdminEmail(data),
    onSuccess: () => {
      toast.success('Test email sent successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send test email')
    }
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const downloadRecoveryCodes = () => {
    if (!generatedRecoveryCodes) return
    
    const content = `ULTRA-SECURE RECOVERY CODES\n============================\n\n${generatedRecoveryCodes.map((code, i) => `${(i + 1).toString().padStart(2, ' ')}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Save these codes in a secure location\n- Each code can only be used once\n- Use these if you lose access to your 2FA device\n- Generate new codes if compromised\n\nGenerated: ${new Date().toISOString()}`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recovery-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Security Score Component
  const SecurityScoreCard = () => {
    const score = securityStatus?.data?.security_score || 0
    const level = securityStatus?.data?.security_level || 'LOW_SECURITY'
    
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'from-green-500 to-emerald-600'
      if (score >= 75) return 'from-blue-500 to-indigo-600'
      if (score >= 60) return 'from-yellow-500 to-orange-600'
      return 'from-red-500 to-pink-600'
    }

    const getLevelBadge = (level: string) => {
      const badges = {
        'ULTRA_SECURE': { color: 'bg-green-500', text: '🛡️ ULTRA' },
        'HIGH_SECURITY': { color: 'bg-blue-500', text: '🔒 HIGH' },
        'MEDIUM_SECURITY': { color: 'bg-yellow-500', text: '⚠️ MEDIUM' },
        'LOW_SECURITY': { color: 'bg-red-500', text: '🚨 LOW' }
      }
      return badges[level as keyof typeof badges] || badges.LOW_SECURITY
    }

    const badge = getLevelBadge(level)

    return (
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 bg-gradient-to-br ${getScoreColor(score)} rounded-lg`}>
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Security Score</h3>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-white text-xs font-medium ${badge.color}`}>
              {badge.text}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{score}/100</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getScoreColor(score)} transition-all duration-1000`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>

        {securityStatus?.data?.recommendations && securityStatus.data.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Recommendations:</h4>
            {securityStatus.data.recommendations.slice(0, 2).map((rec: any, index: number) => (
              <div key={index} className={`p-2 rounded-lg border text-xs ${
                rec.priority === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-700/50 text-red-700 dark:text-red-300' :
                rec.priority === 'high' ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-300' :
                'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-700/50 text-blue-700 dark:text-blue-300'
              }`}>
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{rec.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Overview Tab
  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SecurityScoreCard />
      
      {/* Profile Summary */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <User className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-gray-900 dark:text-white truncate">{settings?.data?.profile?.email}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <Globe className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs text-gray-900 dark:text-white truncate">{settings?.data?.profile?.company_name}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <Calendar className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-gray-900 dark:text-white">
              {settings?.data?.profile?.created_at ? new Date(settings.data.profile.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs text-gray-900 dark:text-white">
              {settings?.data?.security_stats?.recovery_codes_count || 0} codes
            </span>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4 lg:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Security Features</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {settings?.data?.security_features && Object.entries(settings.data.security_features).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
              <span className="text-xs font-medium text-gray-900 dark:text-white capitalize truncate">
                {key.replace(/_/g, ' ')}
              </span>
              {enabled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Password Tab
  const renderPasswordTab = () => (
    <div className="max-w-2xl">
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h3>
        </div>

        <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-3">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                {...passwordForm.register('current_password')}
                className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {passwordForm.formState.errors.current_password && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.current_password.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                {...passwordForm.register('new_password')}
                className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all pr-10"
                placeholder="16+ chars, uppercase, lowercase, number, special"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {passwordForm.formState.errors.new_password && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.new_password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                {...passwordForm.register('confirm_password')}
                className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {passwordForm.formState.errors.confirm_password && (
              <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {changePasswordMutation.isPending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Change Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )

  // API Key Management Tab
  const renderApiKeyTab = () => (
    <div className="max-w-2xl space-y-3">
      {/* Current API Key */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
            <Key className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Current API Key</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
            {settings?.data?.profile?.api_key || '••••••••••••••••'}
          </div>
          <button
            onClick={() => copyToClipboard(settings?.data?.profile?.api_key || '', 'API Key')}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
        </div>
      </div>

      {/* Generated API Key */}
      {generatedApiKey && (
        <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">New API Key Generated!</h4>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-600 rounded-lg font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
              {generatedApiKey}
            </div>
            <button
              onClick={() => copyToClipboard(generatedApiKey, 'New API Key')}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300">
            <AlertTriangle className="h-3 w-3" />
            <span>Save this key securely! It will not be shown again.</span>
          </div>
        </div>
      )}

      {/* Regenerate Form */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Regenerate API Key</h4>
        <form onSubmit={apiKeyForm.handleSubmit((data) => regenerateApiKeyMutation.mutate(data))} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              {...apiKeyForm.register('current_password')}
              className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
              placeholder="Enter password"
            />
            {apiKeyForm.formState.errors.current_password && (
              <p className="text-red-500 text-xs mt-1">{apiKeyForm.formState.errors.current_password.message}</p>
            )}
          </div>

          <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Warning</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Regenerating will invalidate the current key immediately.</p>
          </div>

          <button
            type="submit"
            disabled={regenerateApiKeyMutation.isPending}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {regenerateApiKeyMutation.isPending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Key className="h-3.5 w-3.5" />
                Regenerate API Key
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )

  // Recovery Codes Tab
  const renderRecoveryTab = () => (
    <div className="max-w-2xl space-y-3">
      {/* Status */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg">
            <RefreshCw className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recovery Codes</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {settings?.data?.security_stats?.recovery_codes_count || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
          </div>
          <div className="text-center p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {settings?.data?.security_stats?.recovery_codes_count || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
        </div>
        {(!settings?.data?.security_stats?.recovery_codes_count || settings.data.security_stats.recovery_codes_count === 0) && (
          <div className="p-2 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/50 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
            Generate codes for emergency access
          </div>
        )}
      </div>

      {/* Generated Codes */}
      {generatedRecoveryCodes && (
        <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">New Codes Generated!</h4>
            </div>
            <button onClick={downloadRecoveryCodes} className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs">
              <Download className="h-3 w-3" />
              Download
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {generatedRecoveryCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-1.5 p-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-600 rounded-lg">
                <span className="text-xs font-bold text-orange-600 w-4">{index + 1}.</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 flex-1">{code}</span>
                <button onClick={() => copyToClipboard(code, `Code ${index + 1}`)} className="p-0.5 text-orange-500 hover:text-orange-600">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300">⚠️ Save securely! Won't be shown again.</p>
        </div>
      )}

      {/* Generate Form */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Generate New Codes</h4>
        <form onSubmit={recoveryCodesForm.handleSubmit((data) => regenerateRecoveryCodesMutation.mutate(data))} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
            <input type="password" {...recoveryCodesForm.register('current_password')} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all" placeholder="Enter password" />
            {recoveryCodesForm.formState.errors.current_password && (
              <p className="text-red-500 text-xs mt-1">{recoveryCodesForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <button type="submit" disabled={regenerateRecoveryCodesMutation.isPending} className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
            {regenerateRecoveryCodesMutation.isPending ? (<><RefreshCw className="h-3.5 w-3.5 animate-spin" />Generating...</>) : (<><RefreshCw className="h-3.5 w-3.5" />Generate Codes</>)}
          </button>
        </form>
      </div>
    </div>
  )

  // Two-Factor Authentication Tab
  const renderTwoFactorTab = () => (
    <div className="max-w-2xl space-y-3">
      {/* Status */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Fingerprint className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">2FA Status</h3>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            (settings?.data?.security_features?.two_factor_authentication === true) 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {(settings?.data?.security_features?.two_factor_authentication === true) ? '✅ Enabled' : '❌ Disabled'}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <Smartphone className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <div className="text-xs font-medium text-gray-900 dark:text-white">Authenticator</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {(settings?.data?.security_features?.two_factor_authentication === true) ? 'Active' : 'Not Setup'}
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
            <RefreshCw className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <div className="text-xs font-medium text-gray-900 dark:text-white">Backup Codes</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{settings?.data?.security_stats?.recovery_codes_count || 0} Available</div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      {(qrCodeUrl || (twoFactorStatus?.data?.pending_setup && twoFactorStatus?.data?.qr_code_url)) && (
        <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-purple-500" />
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Setup Authenticator</h4>
            </div>
            <button onClick={() => toggleTwoFactorMutation.mutate({ current_password: '', action: 'reset' })} className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">Reset</button>
          </div>
          <div className="text-center mb-2">
            <div className="inline-block p-3 bg-white rounded-lg border border-purple-200">
              <QRCodeSVG value={qrCodeUrl || twoFactorStatus?.data?.qr_code_url || ''} size={180} level="H" includeMargin={true} />
            </div>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-purple-700 dark:text-purple-300">
            <li>Install Google Authenticator or similar app</li>
            <li>Scan QR code above</li>
            <li>Enter 6-digit code below to verify</li>
          </ol>
        </div>
      )}

      {/* Toggle Form */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {(settings?.data?.security_features?.two_factor_authentication === true) ? 'Disable 2FA' : twoFactorStatus?.data?.pending_setup ? 'Complete Setup' : 'Enable 2FA'}
        </h4>
        <form onSubmit={twoFactorForm.handleSubmit((data) => {
          const action = (settings?.data?.security_features?.two_factor_authentication === true) ? 'disable' : 'enable'
          toggleTwoFactorMutation.mutate({ ...data, action })
        })} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
            <input type="password" {...twoFactorForm.register('current_password')} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" placeholder="Enter password" />
            {twoFactorForm.formState.errors.current_password && (
              <p className="text-red-500 text-xs mt-1">{twoFactorForm.formState.errors.current_password.message}</p>
            )}
          </div>

          {((settings?.data?.security_features?.two_factor_authentication === true) || (twoFactorStatus?.data?.pending_setup)) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {(settings?.data?.security_features?.two_factor_authentication === true) ? '2FA Code (Required)' : 'Verification Code'}
              </label>
              <input type="text" {...twoFactorForm.register('totp_code')} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" placeholder="6-digit code" maxLength={6} />
            </div>
          )}

          <button type="submit" disabled={toggleTwoFactorMutation.isPending} className={`w-full px-4 py-2 text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
            (settings?.data?.security_features?.two_factor_authentication === true)
              ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white'
          }`}>
            {toggleTwoFactorMutation.isPending ? (<><RefreshCw className="h-3.5 w-3.5 animate-spin" />{(settings?.data?.security_features?.two_factor_authentication === true) ? 'Disabling...' : 'Processing...'}</>) : (<><Fingerprint className="h-3.5 w-3.5" />{(settings?.data?.security_features?.two_factor_authentication === true) ? 'Disable 2FA' : twoFactorStatus?.data?.pending_setup ? 'Complete Setup' : 'Enable 2FA'}</>)}
          </button>
        </form>
      </div>
    </div>
  )

  // Enhanced Security Tab (Phase 3)
  const renderEnhancedSecurityTab = () => (
    <div className="space-y-4">
      <IPRestrictionManager
        restrictions={ipRestrictions?.data || []}
        isEnabled={securitySettings.ip_restrictions_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, ip_restrictions_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ ip_restrictions_enabled: enabled })
        }}
        onAddIP={async (data) => await addIPRestrictionMutation.mutateAsync(data)}
        onRemoveIP={async (id) => await removeIPRestrictionMutation.mutateAsync(id)}
        onToggleIP={async (id, active) => await toggleIPRestrictionMutation.mutateAsync({ id, is_active: active })}
        isLoading={updateSecuritySettingsMutation.isPending || addIPRestrictionMutation.isPending}
      />

      <DeviceFingerprintManager
        devices={deviceFingerprints?.data || []}
        isEnabled={securitySettings.device_fingerprinting_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, device_fingerprinting_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ device_fingerprinting_enabled: enabled })
        }}
        onRemoveDevice={async (deviceId) => await removeDeviceMutation.mutateAsync(deviceId)}
        onToggleTrust={async (deviceId, trusted) => await toggleDeviceTrustMutation.mutateAsync({ deviceId, is_trusted: trusted })}
        isLoading={updateSecuritySettingsMutation.isPending || removeDeviceMutation.isPending}
      />

      <LoginNotificationSettings
        isEnabled={securitySettings.login_notifications_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, login_notifications_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ login_notifications_enabled: enabled })
        }}
        recentNotifications={loginNotifications?.data || []}
        isLoading={updateSecuritySettingsMutation.isPending}
      />

      <CaptchaSettings
        captchaAfterFailedAttempts={securitySettings.captcha_after_failed_attempts}
        maxFailedAttempts={securitySettings.max_failed_attempts}
        lockoutDurationMinutes={securitySettings.lockout_duration_minutes}
        onUpdateSettings={async (settings) => {
          setSecuritySettings(prev => ({ ...prev, ...settings }))
          await updateSecuritySettingsMutation.mutateAsync(settings)
        }}
        isLoading={updateSecuritySettingsMutation.isPending}
      />
    </div>
  )

  // Email Settings Tab
  const renderEmailSettingsTab = () => (
    <div className="max-w-3xl space-y-3">
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email Configuration</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Provider</label>
              <select value={emailSettings.provider} onChange={(e) => setEmailSettings(prev => ({ ...prev, provider: e.target.value }))} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all">
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo</option>
                <option value="hostinger">Hostinger</option>
                <option value="godaddy">GoDaddy</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <input type="email" value={emailSettings.email_address} onChange={(e) => setEmailSettings(prev => ({ ...prev, email_address: e.target.value }))} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all" placeholder="your-email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPasswords.email ? 'text' : 'password'} value={emailSettings.email_password || ''} onChange={(e) => setEmailSettings(prev => ({ ...prev, email_password: e.target.value }))} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all pr-10" placeholder="App password" />
                <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, email: !prev.email }))} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPasswords.email ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">From Name</label>
              <input type="text" value={emailSettings.from_name} onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))} className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all" placeholder="System Security" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Config</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${emailSettings.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    {emailSettings.is_active ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
                {emailUsage?.data && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Today</span>
                      <span className="font-medium text-gray-900 dark:text-white">{emailUsage.data.emails_sent_today}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Total</span>
                      <span className="font-medium text-gray-900 dark:text-white">{emailUsage.data.total_emails_sent}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 rounded-lg">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Test Email</h4>
              <div className="space-y-2">
                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" placeholder="test@example.com" />
                <button onClick={() => !testEmailMutation.isPending && testEmailMutation.mutate({ test_email: testEmail || undefined })} disabled={testEmailMutation.isPending || !emailSettings.is_active} className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs">
                  <Mail className="h-3 w-3" />
                  {testEmailMutation.isPending ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
          <button onClick={() => { const updatedSettings = { ...emailSettings, is_active: true }; setEmailSettings(updatedSettings); updateEmailSettingsMutation.mutate(updatedSettings); }} disabled={updateEmailSettingsMutation.isPending || !emailSettings.email_address || !emailSettings.email_password} className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
            <Save className="h-3.5 w-3.5" />
            {updateEmailSettingsMutation.isPending ? 'Saving...' : 'Save & Activate'}
          </button>
          <button onClick={() => { const updatedSettings = { ...emailSettings, is_active: false }; setEmailSettings(updatedSettings); updateEmailSettingsMutation.mutate(updatedSettings); }} disabled={updateEmailSettingsMutation.isPending} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2">
            Deactivate
          </button>
        </div>
      </div>
    </div>
  )

  // Security Log Tab
  const renderSecurityLogTab = () => (
    <div className="max-w-4xl space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="text-center p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-700/50 rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{securityLog?.data?.security_summary?.total_logins || 0}</div>
          <div className="text-xs text-green-700 dark:text-green-300">Logins</div>
        </div>
        <div className="text-center p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-700/50 rounded-lg">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{securityLog?.data?.security_summary?.failed_attempts || 0}</div>
          <div className="text-xs text-red-700 dark:text-red-300">Failed</div>
        </div>
        <div className="text-center p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{securityLog?.data?.security_summary?.password_changes || 0}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300">Password Changes</div>
        </div>
        <div className="text-center p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/50 rounded-lg">
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{securityLog?.data?.security_summary?.suspicious_activities || 0}</div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300">Suspicious</div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            Auto-refresh 30s
          </div>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {securityLog?.data?.logs?.length > 0 ? (
            securityLog?.data?.logs?.map((log: any, index: number) => (
              <div key={index} className={`p-3 rounded-lg border text-xs ${
                log.severity === 'high' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-700/50' :
                log.severity === 'medium' ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-700/50' :
                'bg-gray-50/50 dark:bg-gray-700/30 border-gray-200/50 dark:border-gray-600/50'
              }`}>
                <div className="flex items-start gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    log.severity === 'high' ? 'bg-red-500' :
                    log.severity === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white">{log.event_type.replace(/_/g, ' ')}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        log.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        log.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {log.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-1">{log.details}</p>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <span>📅 {new Date(log.timestamp).toLocaleString()}</span>
                      <span>🌐 {log.ip_address}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-xs">No security events recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ultra-Secure Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Military-grade security configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200/50 dark:border-green-700/50 text-xs font-medium flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            SECURE
          </div>
          {masterAdminProfile?.data?.days_until_expiry !== undefined && (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              masterAdminProfile.data.days_until_expiry <= 7
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-700/50'
                : masterAdminProfile.data.days_until_expiry <= 30
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-700/50'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50'
            }`}>
              <Clock className="h-3 w-3" />
              {masterAdminProfile.data.days_until_expiry}d
            </div>
          )}
        </div>
      </div>

      {/* Single Premium Window */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden h-[calc(100vh-12rem)]">
        {/* Sidebar + Content Layout */}
        <div className="flex h-full">
          {/* Left Sidebar Navigation */}
          <div className="w-48 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-3 flex-shrink-0">
            <div className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: Shield },
                { id: 'password', label: 'Password', icon: Lock },
                { id: 'api-key', label: 'API Key', icon: Key },
                { id: 'recovery', label: 'Recovery', icon: RefreshCw },
                { id: '2fa', label: '2FA', icon: Fingerprint },
                { id: 'enhanced', label: 'Enhanced', icon: Settings },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'password' && renderPasswordTab()}
            {activeTab === 'api-key' && renderApiKeyTab()}
            {activeTab === 'recovery' && renderRecoveryTab()}
            {activeTab === '2fa' && renderTwoFactorTab()}
            {activeTab === 'enhanced' && renderEnhancedSecurityTab()}
            {activeTab === 'email' && renderEmailSettingsTab()}
            {activeTab === 'activity' && renderSecurityLogTab()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UltraSecureMasterAdminSettings