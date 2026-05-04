import React, { useState, useEffect } from 'react'
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  Settings, LogOut, Menu, Bell, AlertTriangle
} from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { SapSidebar } from '../components/layout/SapSidebar'
import { menuByRole } from '../components/layout/menuConfig'
import { apiClient } from '../lib/api'
import { useOnboardingGuard } from '../hooks/useOnboardingGuard'

const MasterAdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, hydrated, subscription, fetchSubscriptionStatus } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenantName, setTenantName] = useState<string | null>(null)

  // Onboarding guard — skip for setup/waiting pages
  const bypassPaths = ['/master-admin/company-setup', '/master-admin/waiting']
  const guardStatus = useOnboardingGuard()
  const isBypass = bypassPaths.some(p => location.pathname.startsWith(p))

  const sidebarItems = menuByRole.masteradmin()

  useEffect(() => {
    if (hydrated && user?.athens_tenant_id && !tenantName) {
      fetchTenantName()
    }
  }, [hydrated, user?.athens_tenant_id])

  // Fetch subscription status on mount if not already loaded
  useEffect(() => {
    if (hydrated && user?.user_type === 'masteradmin' && !subscription) {
      fetchSubscriptionStatus()
    }
  }, [hydrated, user])

  // Redirect to subscription-expired if inactive
  useEffect(() => {
    if (
      subscription &&
      !subscription.is_active &&
      !location.pathname.startsWith('/subscription-expired')
    ) {
      navigate('/subscription-expired', { replace: true })
    }
  }, [subscription, location.pathname])

  const fetchTenantName = async () => {
    try {
      const response = await apiClient.get('/api/auth/masteradmin/my-tenant/')
      if (response.data && response.data.name) {
        setTenantName(response.data.name)
      }
    } catch (error) {
      setTenantName(user?.company_name || null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Show spinner while guard is checking (only for non-bypass pages)
  if (!isBypass && guardStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-canvas text-foreground">
      {/* Subscription expiry warning banner */}
      {subscription?.warning && (
        <div className="shrink-0 bg-amber-500 text-white px-6 py-2 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Your subscription expires in {subscription.days_remaining} day{subscription.days_remaining !== 1 ? 's' : ''} (on {subscription.end}). Please contact SuperAdmin to renew.
          </span>
        </div>
      )}

      {/* Fixed Header */}
      <header className="z-40 shrink-0 bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur-xl shadow-lg rounded-b-2xl">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-primary shadow-md flex items-center justify-center">
                <span className="text-xl text-amber-400">🏢</span>
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-bold text-foreground">ATHENS 2.0</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>🏗️</span>
                <span>Master Admin Portal</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-card/80 rounded-full shadow-sm">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {tenantName || user?.company_name || 'Loading...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/master-admin/settings')}
              className="p-2 text-muted-foreground hover:bg-accent/50 rounded-full transition-all relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            </button>
            <Link
              to="/master-admin/settings"
              className="p-2 text-muted-foreground hover:bg-accent/50 rounded-full transition-all relative"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-emerald-500 rounded-full" />
            </Link>
            <div className="h-6 w-px bg-border/50 mx-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/30 to-accent/10 rounded-full">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.email?.[0]?.toUpperCase() || 'M'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-medium text-foreground leading-tight">{user?.email?.split('@')[0] || 'master'}</div>
                <div className="text-[10px] text-muted-foreground">Master Admin</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-full transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Fixed scroll container */}
        <SapSidebar
          title="Navigation"
          subtitle="Master Admin"
          items={sidebarItems}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main Content - Independent scroll container */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto px-6 py-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default MasterAdminLayout