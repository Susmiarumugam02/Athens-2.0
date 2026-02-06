import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Settings, LogOut, Menu, X, FolderKanban } from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'

interface MasterAdminLayoutProps {
  children: React.ReactNode
}

const MasterAdminLayout: React.FC<MasterAdminLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Dashboard', href: '/master-admin', icon: LayoutDashboard },
    { name: 'Projects', href: '/master-admin/projects', icon: FolderKanban },
    { name: 'Settings', href: '/master-admin/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-app-canvas text-foreground">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <h1 className="text-xl font-bold text-primary">Athens 2.0</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className={`mr-3 flex h-9 w-9 items-center justify-center rounded-lg ${
                    isActive ? 'bg-white/20' : 'bg-primary/10'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Master Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/70 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-muted-foreground hover:bg-accent rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
                System Online
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MasterAdminLayout
