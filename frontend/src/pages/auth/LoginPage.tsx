import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, Mail, Lock, Sparkles, Zap, Globe } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { hasCompletedInductionAccess } from '../../utils/accessState'
import SecurityAlerts from '../../components/auth/SecurityAlerts'
import AccountLockoutWarning from '../../components/auth/AccountLockoutWarning'
import PasswordExpiryWarning from '../../components/auth/PasswordExpiryWarning'

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const { 
    login, 
    isLoading, 
    error, 
    accountLocked, 
    remainingAttempts, 
    lockoutExpiresAt,
    passwordExpiresInDays,
    passwordExpiresAt,
    securityAlerts,
    isAuthenticated,
    user
  } = useAuthStore()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Initial page load
  useEffect(() => {
    // Clear any stale redirects
    sessionStorage.removeItem('next_route')
    
    // Handle redirect parameter from URL
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    
    if (redirect === 'athens') {
      // Don't redirect to Athens Sustainability, redirect to main app
      sessionStorage.setItem('next_route', '/app')
    } else if (redirect && redirect !== '/services/athens_sustainability/dashboard') {
      sessionStorage.setItem('next_route', redirect)
    }
    
    const timer = setTimeout(() => setIsPageLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Handle authentication redirect with loading screen
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      setIsTransitioning(true)
      // next_route is stored by authStore.login in sessionStorage
      const nextRoute = sessionStorage.getItem('next_route')
      sessionStorage.removeItem('next_route')
      const userType = (user as any).user_type
      const roleType = (user as any).role_type
      const isFirstLogin = (user as any).is_first_login
      const approvalStatus = (user as any).approval_status
      const workflowApprovalStatus = (user as any).workflow_approval_status
      const profileCompleted = Boolean((user as any).profile_completed)
      const trainingStatus = (user as any).training_status
      const hasFullAccess = hasCompletedInductionAccess(user)

      setTimeout(() => {
        // next_route from backend takes priority
        if (nextRoute && nextRoute !== '') {
          window.location.href = nextRoute
          return
        }
        // Fallback routing by user type
        if (userType === 'superadmin') {
          window.location.href = '/superadmin/dashboard'
        } else if (userType === 'masteradmin') {
          window.location.href = '/master-admin'
        } else if (userType === 'companyuser') {
          if (roleType === 'user') {
            const userStatus = (user as any).status
            if (!profileCompleted || userStatus === 'pending_profile' || isFirstLogin) {
              window.location.href = '/user/complete-profile'
            } else if (
              userStatus === 'pending_approval' ||
              approvalStatus === 'waiting_admin_approval' ||
              workflowApprovalStatus === 'waiting_admin_approval'
            ) {
              window.location.href = '/user/approval-pending'
            } else if (!hasFullAccess && approvalStatus === 'approved' && trainingStatus !== 'completed') {
              window.location.href = '/user/induction-pending'
            } else if (approvalStatus === 'rejected') {
              window.location.href = '/user/rejected'
            } else if (hasFullAccess) {
              window.location.href = '/app/dashboard'
            } else {
              window.location.href = '/user/induction-pending'
            }
          } else {
            window.location.href = '/app'
          }
        } else if (userType === 'serviceuser') {
          window.location.href = '/service'
        } else {
          window.location.href = '/app'
        }
      }, 400)
    }
  }, [isAuthenticated, user, isLoading])

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data)
    
    if (result === true) {
      reset()
      setHasFailedAttempt(false)
    } else if (result && typeof result === 'object' && 'requires_2fa' in result && result.requires_2fa === true) {
      setHasFailedAttempt(false)
      sessionStorage.setItem('2fa_credentials', JSON.stringify({ credentials: data }))
      setIsTransitioning(true)
      setTimeout(() => window.location.replace('/auth/2fa'), 400)
    } else {
      setHasFailedAttempt(true)
    }
  }

  // Minimal Loading Screen
  if (isPageLoading || isTransitioning) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-light text-white tracking-[0.3em] animate-pulse">
            ᗩTᕼᙓᑎᗩ'𝔖
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Optimized Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          
          {/* Left Panel */}
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wider">ᗩTᕼᙓᑎᗩ'𝔖</h1>
                <p className="text-blue-300 text-sm font-medium">Enterprise Platform</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-white leading-tight">
                Next-Gen<br/>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  EHS Platform
                </span>
              </h2>
              <p className="text-lg text-gray-300 max-w-xl">
                Unified workspace for Environment, Health, Safety, Quality & Sustainability
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Zap className="w-6 h-6 text-blue-400 mb-2" />
                <p className="text-xs text-white font-medium">Lightning Fast</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Shield className="w-6 h-6 text-purple-400 mb-2" />
                <p className="text-xs text-white font-medium">Ultra Secure</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Sparkles className="w-6 h-6 text-pink-400 mb-2" />
                <p className="text-xs text-white font-medium">AI Powered</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <Globe className="w-4 h-4" />
              <span>Trusted by 500+ organizations</span>
            </div>
          </div>

          {/* Right Panel - Login Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-xl opacity-20" />
              
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                
                <div className="text-center mb-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 border border-white/20 rounded-full mb-3">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-white font-medium">Secure Access</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">Welcome Back</h3>
                  <p className="text-sm text-gray-300">Sign in to your workspace</p>
                </div>

                <SecurityAlerts alerts={securityAlerts} />
                {(hasFailedAttempt || accountLocked) && (
                  <AccountLockoutWarning 
                    isLocked={accountLocked}
                    remainingAttempts={remainingAttempts}
                    lockoutExpiresAt={lockoutExpiresAt}
                  />
                )}
                <PasswordExpiryWarning 
                  expiresInDays={passwordExpiresInDays}
                  expiresAt={passwordExpiresAt}
                />

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-red-200 text-sm text-center">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1.5">Email or Username</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('email')}
                        type="text"
                        autoComplete="username email"
                        className={`w-full pl-10 pr-4 py-3 bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                        placeholder="Email or username"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`w-full pl-10 pr-10 py-3 bg-white/5 border ${errors.password ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || accountLocked}
                    className="w-full relative group disabled:opacity-50"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl">
                      {isLoading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Signing In...</span>
                        </span>
                      ) : (
                        'Sign In'
                      )}
                    </div>
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Enterprise encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-xs text-gray-500">© 2025 ᗩTᕼᙓᑎᗩ'𝔖 Technologies</p>
      </div>
    </div>
  )
}

export default LoginPage
