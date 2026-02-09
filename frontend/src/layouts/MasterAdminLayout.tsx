import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Settings, LogOut, Menu, FolderKanban, Bell } from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { SapSidebar } from '../components/layout/SapSidebar'

interface MasterAdminLayoutProps {
  children: React.ReactNode
}

const MasterAdminLayout: React.FC<MasterAdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sidebarItems = [
    { label: 'Dashboard', description: 'Overview and insights', href: '/master-admin', icon: LayoutDashboard },
    { label: 'Projects', description: 'Manage projects', href: '/master-admin/projects', icon: FolderKanban },
    { label: 'Settings', description: 'Account settings', href: '/master-admin/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-app-canvas text-foreground">
      {/* Header - Premium SAP Style - Full Width */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur-xl shadow-lg rounded-b-2xl">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left Section - Logo & Branding */}
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

          {/* Center Section - Status */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-card/80 rounded-full shadow-sm">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">System Online</span>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="p-2 text-muted-foreground hover:bg-accent/50 rounded-full transition-all relative">
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
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
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

      {/* Sidebar - Below Header */}
      <div className="pt-16">
        <SapSidebar
          title="Navigation"
          subtitle="Control Center"
          items={sidebarItems}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="pt-16 lg:pl-64">
        <main className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MasterAdminLayout
