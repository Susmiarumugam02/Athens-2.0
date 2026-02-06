import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Leaf, BarChart3, Briefcase, Users, Settings,
  LogOut, Sun, Moon, ChevronRight,
  Calendar, TrendingUp, CheckCircle, Menu, X, Bell
} from 'lucide-react'
import { useThemeStore } from '../../../store/themeStore'
import { useServiceUserStore } from '../../../store/serviceUserStore'
import api from '../../../lib/api'

interface AthensLayoutProps {
  children?: React.ReactNode
  currentPage?: string
}

const AthensLayout: React.FC<AthensLayoutProps> = ({ children, currentPage = 'overview' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState(currentPage)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey
      if (serviceUser?.company_id && currentSessionKey) {
        const response = await api.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: {
            'Authorization': `Bearer ${currentSessionKey}`
          },
          params: {
            session_key: currentSessionKey
          }
        })
        setCompanyData(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching company logo:', error)
    }
  }

  // Update activeTab based on current route
  useEffect(() => {
    const path = location.pathname.replace('/services/athens-sustainability/', '').replace('/services/athens-sustainability', '')
    if (path === '' || path === '/') {
      setActiveTab('overview')
    } else {
      setActiveTab(path)
    }
  }, [location.pathname])

  useEffect(() => {
    if (serviceUser?.company_name) {
      setCompanyData({
        id: serviceUser.company_id,
        name: serviceUser.company_name,
        logo: null
      })

      if (sessionKey) {
        fetchCompanyData()
      } else {
        setTimeout(() => {
          const currentSessionKey = useServiceUserStore.getState().sessionKey
          if (currentSessionKey) {
            fetchCompanyData()
          }
        }, 1000)
      }
    }
  }, [serviceUser?.company_id, sessionKey])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Athens sidebar menu items
  const sidebarSections = [
    {
      title: 'Dashboard',
      items: [
        { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-green-600' }
      ]
    },
    {
      title: 'Project Management',
      items: [
        { id: 'projects', label: 'Projects', icon: Briefcase, color: 'text-blue-600' },
        { id: 'deadlines', label: 'Deadlines', icon: Calendar, color: 'text-orange-600' },
        { id: 'progress', label: 'Progress Tracking', icon: TrendingUp, color: 'text-purple-600' }
      ]
    },
    {
      title: 'Team Management',
      items: [
        { id: 'employees', label: 'Team Members', icon: Users, color: 'text-indigo-600' },
        { id: 'approvals', label: 'Approvals', icon: CheckCircle, color: 'text-green-600' }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' }
      ]
    }
  ]

  const renderContent = () => {
    if (children) return children
    
    // Default dashboard content
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2 flex items-center space-x-2">
            <Leaf className="h-6 w-6" />
            <span>Athens Sustainability Module</span>
          </h1>
          <p className="text-green-100">Manage your sustainability projects and environmental initiatives</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[var(--z-overlay)] bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside id="sidebar" className={`fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Sidebar Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              {companyData?.logo ? (
                <img src={companyData.logo} alt="Company logo" className="h-full w-full object-cover" />
              ) : (
                <Leaf className="h-4 w-4 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xs font-semibold text-gray-900 dark:text-white">Athens Sustainability</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {companyData?.name || serviceUser?.company_name || 'Company'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="px-3 py-4">
            <div className="space-y-4">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'overview') {
                              navigate('/services/athens-sustainability/')
                            } else {
                              navigate(`/services/athens-sustainability/${item.id}`)
                            }
                          }}
                          className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-white' : item.color}`} />
                          {item.label}
                          {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* User Info at Bottom - Fixed */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {serviceUser?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {serviceUser?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {serviceUser?.role || 'Athens User'}
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            </button>
            <button
              onClick={serviceUserLogout}
              className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/company/services')}
                  className="hidden lg:flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to Services
                </button>
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 hidden lg:block"></div>
                <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Athens Sustainability
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  {notificationOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[var(--z-dropdown)]">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="p-3">
                        <div className="text-center py-6">
                          <Bell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">No notifications</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default AthensLayout