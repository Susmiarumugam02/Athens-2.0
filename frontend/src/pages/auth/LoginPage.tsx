import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import SecurityAlerts from '../../components/auth/SecurityAlerts'
import AccountLockoutWarning from '../../components/auth/AccountLockoutWarning'
import PasswordExpiryWarning from '../../components/auth/PasswordExpiryWarning'
import athenasLogo from '../../assets/logo.jpeg'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false)

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
  const { theme, toggleTheme } = useThemeStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Auto-redirect based on user type and next_route
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      const nextRoute = sessionStorage.getItem('next_route')
      if (nextRoute) {
        window.location.href = nextRoute
      } else {
        // Fallback routing based on user_type
        const userType = (user as any).user_type
        if (userType === 'superadmin') {
          window.location.href = '/superadmin/dashboard'
        } else if (userType === 'masteradmin') {
          window.location.href = '/master-admin'
        } else if (userType === 'companyuser') {
          window.location.href = '/app'
        } else if (userType === 'serviceuser') {
          window.location.href = '/service'
        } else {
          window.location.href = '/app'
        }
      }
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
      window.location.replace('/auth/2fa')
    } else {
      setHasFailedAttempt(true)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group z-50"
      >
        <div className="relative">
          {theme === 'light' ? (
            <div className="text-yellow-300 group-hover:rotate-180 transition-transform duration-500">🌙</div>
          ) : (
            <div className="text-yellow-400 group-hover:rotate-180 transition-transform duration-500">☀️</div>
          )}
        </div>
      </button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
                  <img
                    src={athenasLogo}
                    alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo"
                    className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-2xl"
                  />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-6xl font-athenas tracking-wider leading-none">
                    <span className="text-white text-shadow-lg">ᗩTᕼᙓᑎᗩ</span>
                    <span className="text-green-400 text-shadow-lg athenas-glow">'𝔖</span>
                  </h1>
                  <p className="text-lg lg:text-xl text-blue-200 font-medium mt-2">Enterprise Solutions</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl lg:text-4xl font-bold text-white leading-tight">
                  Next-Generation
                  <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Enterprise Platform
                  </span>
                </h2>
                <p className="text-lg text-gray-300 max-w-lg mx-auto lg:mx-0">
                  Secure access to your enterprise workspace. Sign in to continue.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-xl"></div>
              
              <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-white/20 mb-4">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-medium">Secure Access Portal</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
                  <p className="text-gray-300">Sign in to access your workspace</p>
                </div>

                {/* Security Components */}
                <SecurityAlerts alerts={securityAlerts} />
                {(hasFailedAttempt || accountLocked) && (
                  <AccountLockoutWarning 
                    isLocked={accountLocked}
                    remainingAttempts={remainingAttempts || undefined}
                    lockoutExpiresAt={lockoutExpiresAt || undefined}
                  />
                )}
                <PasswordExpiryWarning 
                  expiresInDays={passwordExpiresInDays || undefined}
                  expiresAt={passwordExpiresAt || undefined}
                />

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-md">
                    <p className="text-red-200 text-sm text-center">{error}</p>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('email')}
                        type="email"
                        autoComplete="email"
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-md transition-all duration-300"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-sm">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-md transition-all duration-300"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-sm">{errors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || accountLocked}
                    className="w-full relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-[1.02] transform">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Signing In...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Sign In</span>
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      )}
                    </div>
                  </button>
                </form>

                {/* Additional Info */}
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    <span>Secured with enterprise-grade encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>© 2025 ᗩTᕼᙓᑎᗩ'𝔖 Technologies</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>All rights reserved</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
