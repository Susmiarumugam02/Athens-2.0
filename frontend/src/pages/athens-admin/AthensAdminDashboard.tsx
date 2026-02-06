import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Bell,
  Settings,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Sparkles,
  ArrowUpRight,
  Calendar,
  Moon,
  Sun,
  LogOut,
  Star,
  Leaf,
  TreePine,
  Recycle,
  Zap,
  Shield,
  Globe
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useThemeStore } from '../../store/themeStore'
import AthensTrainingModule from './AthensTrainingModule'
import EmployeeManagement from './EmployeeManagement'
import athenasLogo from '../../assets/logo.jpeg'

const AthensAdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const [activeSection, setActiveSection] = useState('overview')
  const [athensSession, setAthensSession] = useState<any>(null)

  useEffect(() => {
    const sessionData = sessionStorage.getItem('athens_admin_session')
    if (sessionData) {
      setAthensSession(JSON.parse(sessionData))
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleLogout = () => {
    sessionStorage.removeItem('athens_admin_session')
    navigate('/athens-login')
  }

  const navigationSections = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard analytics and insights' },
    { id: 'training', label: 'Training', icon: Users, description: 'Induction, Job Training & Toolbox Talks' },
    { id: 'employees', label: 'Employee Management', icon: Users, description: 'View and manage employee information' },
    { id: 'analytics', label: 'Analytics', icon: PieChart, description: 'Sustainability metrics and reports' },
    { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Environmental compliance tracking' },
    { id: 'reporting', label: 'Reporting', icon: BarChart3, description: 'Generate sustainability reports' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Account and project settings' }
  ]

  const renderOverviewSection = () => (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {athensSession?.full_name || 'Admin'}! 🌱
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Project Active
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-6 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Leaf className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Carbon Footprint</p>
              <p className="text-3xl font-bold mb-2">2.4t CO₂</p>
              <div className="flex items-center gap-1 text-green-100 text-xs">
                <ArrowUpRight className="h-3 w-3 rotate-180" />
                <span>-15% from last month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-700 p-6 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Recycle className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Waste Recycled</p>
              <p className="text-3xl font-bold mb-2">89%</p>
              <div className="flex items-center gap-1 text-blue-100 text-xs">
                <ArrowUpRight className="h-3 w-3" />
                <span>+8% from last month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 p-6 text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Zap className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Energy Saved</p>
              <p className="text-3xl font-bold mb-2">1.2 MWh</p>
              <div className="flex items-center gap-1 text-orange-100 text-xs">
                <ArrowUpRight className="h-3 w-3" />
                <span>+22% from last month</span>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 p-6 text-white shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Globe className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Sustainability Score</p>
              <p className="text-3xl font-bold mb-2">94/100</p>
              <div className="flex items-center gap-1 text-purple-100 text-xs">
                <Star className="h-3 w-3" />
                <span>Excellent rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <TreePine className="h-4 w-4 mr-2" />
              New Sustainability Initiative
            </Button>
            <Button variant="outline" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Carbon audit completed</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">New team member added</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Monthly report generated</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Info</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{athensSession?.project_name || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
              <p className="font-medium text-gray-900 dark:text-white">{athensSession?.role_type || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection()
      case 'training':
        return <AthensTrainingModule />
      case 'employees':
        return <EmployeeManagement />
      case 'analytics':
        return (
          <div className="text-center py-12">
            <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Sustainability metrics and analytics</p>
          </div>
        )
      case 'compliance':
        return (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Environmental compliance tracking</p>
          </div>
        )
      case 'reporting':
        return (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Reporting</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Generate sustainability reports</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Account and project settings</p>
          </div>
        )
      default:
        return renderOverviewSection()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-100 dark:from-gray-950 dark:via-slate-900 dark:to-green-950/30 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/5">
        <div className="px-6 max-w-none">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                <div className="relative h-14 w-14 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300 group-hover:scale-105">
                  <img
                    src={athenasLogo}
                    alt="Athens Logo"
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-green-800 via-emerald-700 to-teal-800 dark:from-green-200 dark:via-emerald-200 dark:to-teal-200 bg-clip-text text-transparent">
                  Athens Sustainability
                </h1>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Leaf className="h-3 w-3 text-green-500" />
                  Admin Dashboard
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </button>

              <button
                onClick={toggleTheme}
                className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <div className="flex items-center space-x-4 pl-4 border-l border-gray-200/50 dark:border-gray-700/50">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {athensSession?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {athensSession?.role_type || 'Admin'}
                  </p>
                </div>
                <div className="relative group">
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
                    {athensSession?.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-full">
        <aside id="sidebar" className="fixed left-0 top-20 bottom-0 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-r border-gray-200/50 dark:border-gray-700/50 z-[var(--z-sidebar)] shadow-2xl shadow-gray-900/5 flex flex-col">
          {/* Sidebar Header - Fixed */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Navigation</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sustainability Hub</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu - Scrollable */}
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            <div className="space-y-3">
              {navigationSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 transform scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-90"></div>
                    )}
                    <div className="relative z-10 flex items-center space-x-4 w-full">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                      }`}>
                        <Icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition-colors ${
                          isActive ? 'text-white' : ''
                        }`}>{section.label}</p>
                        <p className={`text-xs transition-colors ${
                          isActive ? 'text-white/80' : 'opacity-75'
                        }`}>{section.description}</p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <ArrowUpRight className="h-4 w-4 text-white/80" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Sidebar Footer - Fixed */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Project Status</p>
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Active and monitored
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 ml-72 pt-20 min-h-full relative z-10">
          <div className="w-full max-w-none p-8 overflow-visible">
            <div className="space-y-8 overflow-visible">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    {(() => {
                      const section = navigationSections.find(s => s.id === activeSection)
                      const Icon = section?.icon || BarChart3
                      return <Icon className="h-6 w-6 text-white" />
                    })()}
                  </div>
                  <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-green-800 via-emerald-700 to-teal-800 dark:from-green-200 dark:via-emerald-200 dark:to-teal-200 bg-clip-text text-transparent">
                      {navigationSections.find(s => s.id === activeSection)?.label || 'Overview'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      {navigationSections.find(s => s.id === activeSection)?.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-visible">
                {renderSectionContent()}
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="fixed bottom-0 left-72 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-t border-gray-200/50 dark:border-gray-700/50 z-40">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>© 2024 Athens Sustainability</span>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>Environmental Impact Management</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AthensAdminDashboard
