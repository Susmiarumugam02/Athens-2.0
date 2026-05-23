import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Menu, Bell, BookOpen, User as UserIcon, Lock, X, CheckCheck } from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { SapSidebar } from '../components/layout/SapSidebar'
import { menuByRole } from '../components/layout/menuConfig'
import { useEnabledModules } from '../hooks/useEnabledModules'
import { apiClient } from '../lib/api'
import tokenManager from '../lib/tokenManager'
import { App as AntdApp } from 'antd'
import AthensAIAssistant from '../components/ai/AthensAIAssistant'
import { hasCompletedInductionAccess } from '../utils/accessState'

const CompanyLayout: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout, hydrated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo: string | null }>({ name: '', logo: null })
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiClient.get('/api/auth/notifications/').then(r => {
      setNotifications(Array.isArray(r.data) ? r.data : r.data.results || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await apiClient.post('/api/auth/notifications/mark-read/', { ids }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const { enabledModules } = useEnabledModules()

  const hasFullAccess = hasCompletedInductionAccess(user)
  const isEmployee = (user as any)?.role_type === 'user'

  // Filter menu items by enabled modules
  const sidebarItems = isEmployee && !hasFullAccess
    ? [
        { label: 'Induction Training', description: 'Complete required training', href: '/user/induction-training', icon: BookOpen },
        { label: 'Profile', description: 'Verification profile', href: '/user/complete-profile', icon: UserIcon },
        { label: 'Change Password', description: 'Account security', href: '/app/settings/change-password', icon: Lock },
      ]
    : menuByRole.companyuser('/app', enabledModules)

  useEffect(() => {
    // Patch C: Only fetch if token exists
    if (hydrated && user && tokenManager.hasTokens()) {
      fetchCompanyInfo()
    }
  }, [hydrated, user])

  useEffect(() => {
    if (!profileMenuOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [profileMenuOpen])

  const fetchCompanyInfo = async () => {
    try {
      const response = await apiClient.getCompanyDetails()
      setCompanyInfo({
        name: response.data.company_name || 'Company',
        logo: response.data.company_logo
      })
    } catch (error) {
      // Don't spam console for expected no-token case
      if ((error as any)?.code !== 'NO_AUTH_TOKEN') {
      }
      // Fallback to user data
      setCompanyInfo({
        name: user?.company_name || 'Company',
        logo: null
      })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-canvas text-foreground">
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
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-600 to-primary shadow-md flex items-center justify-center overflow-hidden">
                  {companyInfo.logo ? (
                    <img src={companyInfo.logo} alt="Company Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl text-amber-400">🏢</span>
                  )}
                </div>
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              <div className="hidden md:block">
                {user?.admin_type ? (
                  // Admin users see ATHENS 2.0 branding
                  <>
                    <div className="text-sm font-normal text-foreground">ᗩTᕼᙓᑎ𝔖 2.0</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>🏗️</span>
                      <span>Project Portal</span>
                    </div>
                  </>
                ) : (
                  // Project users see company name
                  <>
                    <div className="text-sm font-semibold text-foreground">{companyInfo.name}</div>
                    <div className="text-xs text-muted-foreground">Project Management</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-card/80 rounded-full shadow-sm">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {user?.admin_type ? companyInfo.name : `Tenant: ${user?.athens_tenant_id || 'N/A'}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(o => !o)} className="p-2 text-muted-foreground hover:bg-accent/50 rounded-full transition-all relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">Notifications {unreadCount > 0 && <span className="ml-1 text-xs bg-destructive text-white rounded-full px-1.5">{unreadCount}</span>}</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1"><CheckCheck className="w-3 h-3" />Mark all read</button>}
                      <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                        <div className="font-medium text-foreground">{n.title}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{n.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 w-px bg-border/50 mx-1" />
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(open => !open)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/30 to-accent/10 rounded-full transition-all hover:bg-accent"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-foreground leading-tight">{user?.email?.split('@')[0] || 'user'}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {user?.admin_type
                      ? `${user.admin_type.charAt(0).toUpperCase() + user.admin_type.slice(1)} Admin`
                      : user?.user_type === 'masteradmin'
                        ? 'Master Admin'
                        : 'Project User'
                    }
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/app/settings/change-password')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent text-left"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Change Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <SapSidebar
          title="Navigation"
          subtitle="Project Portal"
          items={sidebarItems}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-[1600px] mx-auto px-6 py-6">
                <AntdApp>
                  <Outlet />
                </AntdApp>
              </div>
            </div>
          </main>
      </div>
      <AthensAIAssistant />
    </div>
  )
}

export default CompanyLayout
