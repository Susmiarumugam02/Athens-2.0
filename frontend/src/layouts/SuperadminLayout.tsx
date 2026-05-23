import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  Settings, LogOut, Menu, Bell, X, CheckCheck
} from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { SapSidebar } from '../components/layout/SapSidebar'
import { menuByRole } from '../components/layout/menuConfig'
import { apiClient } from '../lib/api'

const SuperadminLayout: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
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

  const sidebarItems = menuByRole.superadmin()

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
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-primary shadow-md flex items-center justify-center">
                <span className="text-xl text-amber-400">⚡</span>
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full border-2 border-background" />
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-bold text-foreground">ATHENS 2.0</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>⚙</span>
                <span>Master Control Center</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-card/80 rounded-full shadow-sm">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">System Online</span>
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
            <Link
              to="/superadmin/settings"
              className="p-2 text-muted-foreground hover:bg-accent/50 rounded-full transition-all relative"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-emerald-500 rounded-full" />
            </Link>
            <div className="h-6 w-px bg-border/50 mx-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/30 to-accent/10 rounded-full">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.email?.[0]?.toUpperCase() || 'M'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-medium text-foreground leading-tight">{user?.email?.split('@')[0] || 'superadmin'}</div>
                <div className="text-[10px] text-muted-foreground">Super Admin</div>
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
          subtitle="Control Center"
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

export default SuperadminLayout
