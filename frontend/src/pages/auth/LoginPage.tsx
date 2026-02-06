import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, Mail, Lock, ClipboardCheck, ShieldAlert, BadgeCheck, Boxes, Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import SecurityAlerts from '../../components/auth/SecurityAlerts'
import AccountLockoutWarning from '../../components/auth/AccountLockoutWarning'
import PasswordExpiryWarning from '../../components/auth/PasswordExpiryWarning'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      const nextRoute = sessionStorage.getItem('next_route')
      if (nextRoute) {
        window.location.href = nextRoute
      } else {
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      
      {/* Background Layer 1: Radial Glows */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-gradient-radial from-violet-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl"></div>
      
      {/* Background Layer 2: Circuit Pattern */}
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px),
                          repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 40px, rgba(255,255,255,0.03) 41px)`
      }}></div>
      
      {/* Background Layer 3: Particle Dots */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        backgroundPosition: '0 0, 25px 25px'
      }}></div>

      {/* Orbital Ring Behind Card */}
      <div className="absolute top-1/2 right-[10%] w-[500px] h-[500px] border border-white/10 rounded-full blur-sm transform -translate-y-1/2 animate-pulse"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 lg:px-12 py-12">
        <div className="w-full max-w-7xl grid lg:grid-cols-[55%_45%] gap-16 items-center">
          
          {/* LEFT BRAND PANEL */}
          <div className="space-y-10 animate-[fadeIn_0.8s_ease-out]">
            
            {/* Brand Strip */}
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-violet-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                <span className="relative text-3xl font-bold text-white">A</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">ᗩTᕼᙓᑎᗩ'𝔖</h1>
                <p className="text-sm text-blue-300 font-medium">Sustainability Suite</p>
              </div>
            </div>

            {/* Hero Headline */}
            <div className="space-y-4">
              <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                One Platform for<br/>
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  EHS &amp; Quality
                </span>
              </h2>
              <p className="text-2xl text-blue-200 font-semibold">
                Sustainability, Compliance, Performance
              </p>
              <p className="text-lg text-gray-300 max-w-xl leading-relaxed">
                Standardize workflows, reduce risk, and keep every site audit-ready—with optional inventory controls when you need them.
              </p>
            </div>

            {/* Feature Chips */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-white/90 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <ClipboardCheck className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-base">Audits • Inspections • Compliance</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <ShieldAlert className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-base">Incidents • Investigations • CAPA</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <BadgeCheck className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-base">Quality NCR • Analytics • Approvals</span>
              </div>
              <div className="flex items-center space-x-3 text-white/90 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <Boxes className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-base">Inventory (Optional) • Assets • Traceability</span>
              </div>
            </div>

            {/* Module Tiles Illustration */}
            <div className="relative h-48 hidden lg:block">
              {/* EHS Tile */}
              <div className="absolute left-0 top-0 w-40 h-32 bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl transform rotate-[-2deg] hover:-translate-y-2 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative h-full flex flex-col items-center justify-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-blue-400" />
                  <span className="text-white font-semibold text-sm">EHS</span>
                </div>
              </div>
              
              {/* Quality Tile */}
              <div className="absolute left-32 top-8 w-40 h-32 bg-gradient-to-br from-violet-500/20 to-violet-600/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl transform rotate-[1deg] hover:-translate-y-2 transition-all duration-300 group z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-400/0 to-violet-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative h-full flex flex-col items-center justify-center space-y-2">
                  <BadgeCheck className="w-8 h-8 text-violet-400" />
                  <span className="text-white font-semibold text-sm">Quality</span>
                </div>
              </div>
              
              {/* Inventory Tile */}
              <div className="absolute left-64 top-4 w-40 h-32 bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl transform rotate-[-1deg] hover:-translate-y-2 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative h-full flex flex-col items-center justify-center space-y-2">
                  <Boxes className="w-8 h-8 text-purple-400" />
                  <span className="text-white font-semibold text-sm">Inventory</span>
                  <span className="text-xs text-gray-400">(Optional)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT AUTH CARD */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-[slideIn_0.8s_ease-out]">
            <div className="relative">
              {/* Card Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-purple-500/30 rounded-3xl blur-2xl"></div>
              
              {/* Glass Card */}
              <div className="relative bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                {/* Inner Highlight */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                {/* Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-violet-500/20 border border-white/20 rounded-full">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white font-medium">Secure Sustainability Workspace</span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">Welcome to Athens 2.0</h3>
                  <p className="text-gray-300">Sign in to manage EHS, Quality &amp; Sustainability operations</p>
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('email')}
                        type="email"
                        autoComplete="email"
                        className={`w-full pl-12 pr-4 py-3.5 bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-md transition-all`}
                        placeholder="you@company.com"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`w-full pl-12 pr-12 py-3.5 bg-white/5 border ${errors.password ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-md transition-all`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-sm">{errors.password.message}</p>}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">Remember me</span>
                    </label>
                    <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading || accountLocked}
                    className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Signing In...</span>
                        </div>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </div>
                  </button>

                  {/* SSO Button */}
                  <button
                    type="button"
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white font-medium transition-all flex items-center justify-center space-x-2 group"
                  >
                    <Building2 className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    <span>Continue with Organization SSO</span>
                  </button>
                </form>

                {/* Security Footer */}
                <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Enterprise-grade encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-gray-400">ᗩTᕼᙓᑎᗩ'𝔖 Technologies. All rights reserved</p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default LoginPage
