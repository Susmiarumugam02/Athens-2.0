import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../lib/api'
import { LogOut, Bell, Menu, X, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'

// ── All modules the user panel can show (profile_management excluded) ──────────
const ALL_MODULES = [
  { code: 'dashboard',           label: 'Dashboard',          href: '/user/dashboard',              emoji: '🏠' },
  { code: 'ptw',                 label: 'Permit to Work',      href: '/app/ptw',                     emoji: '📋' },
  { code: 'incident',            label: 'Incident Mgmt',       href: '/app/incident-management',     emoji: '⚠️' },
  { code: 'safety',              label: 'Safety Observation',  href: '/app/safety-observation',      emoji: '👁️' },
  { code: 'quality',             label: 'Quality',             href: '/app/quality',                 emoji: '✔️' },
  { code: 'inspection',          label: 'Inspection',          href: '/app/inspection',              emoji: '🔍' },
  { code: 'training',            label: 'Training',            href: '/app/training',                emoji: '📚' },
  { code: 'tbt',                 label: 'TBT',                 href: '/app/tbt',                     emoji: '🛡️' },
  { code: 'ergon_tasks',         label: 'Task Management',     href: '/app/ergon/tasks',             emoji: '✅' },
  { code: 'ergon_planner',       label: 'Daily Planner',       href: '/app/ergon/planner',           emoji: '📅' },
  { code: 'ergon_followups',     label: 'Follow-ups',          href: '/app/ergon/followups',         emoji: '🔔' },
  { code: 'ergon_advance',       label: 'Advance/Expenses',    href: '/app/ergon/advance',           emoji: '💳' },
  { code: 'ergon_manpower',      label: 'Manpower/Machinery',  href: '/app/ergon/manpower',          emoji: '👷' },
  { code: 'ergon_ledger',        label: 'Financial Ledger',    href: '/app/ergon/ledger',            emoji: '💰' },
  { code: 'workforce_attendance',label: 'Attendance',          href: '/app/workforce/attendance',    emoji: '🕐' },
  { code: 'workforce_leave',     label: 'Leave Management',    href: '/app/workforce/leave',         emoji: '🏖️' },
  { code: 'mom',                 label: 'MoM',                 href: '/app/mom',                     emoji: '📝' },
  { code: 'chatbox',             label: 'Chatbox',             href: '/app/chatbox',                 emoji: '💬' },
  { code: 'voice_translator',    label: 'Voice Translator',    href: '/app/voice-translator',        emoji: '🎙️' },
  { code: 'ai_bot',              label: 'AI Bot',              href: '/app/ai-bot',                  emoji: '🤖' },
]

const COMPANY_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  client:     { label: 'Client User',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  epc:        { label: 'EPC User',        color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
  contractor: { label: 'Contractor User', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
}

const UserLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enabledCodes, setEnabledCodes] = useState<string[] | null>(null)

  const companyType = (user as any)?.company_type || 'client'
  const meta = COMPANY_TYPE_META[companyType] || COMPANY_TYPE_META.client
  const username = (user as any)?.username || user?.email?.split('@')[0] || 'User'

  // Fetch enabled modules from backend
  useEffect(() => {
    const projectId = (user as any)?.project_id
    if (!projectId) { setEnabledCodes([]); return }
    apiClient.get(`/api/control-plane/project-modules/?project_id=${projectId}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
        const codes = data.filter((m: any) => m.is_enabled).map((m: any) => m.module_code as string)
        setEnabledCodes(codes)
      })
      .catch(() => setEnabledCodes([]))
  }, [])

  // Dashboard is always visible; other modules shown if enabled (or if no project_id = show all)
  const visibleModules = ALL_MODULES.filter(m => {
    if (m.code === 'dashboard') return true
    if (enabledCodes === null) return false   // still loading
    if (enabledCodes.length === 0) return true // no project restriction = show all
    return enabledCodes.includes(m.code)
  })

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  const handleNav = (href: string) => {
    navigate(href)
    setSidebarOpen(false)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="text-lg font-bold text-gray-900 dark:text-white tracking-wide">ᗩTᕼᙓᑎ𝔖 2.0</div>
        <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
          {meta.label}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {enabledCodes === null ? (
          <div className="text-xs text-gray-400 px-3 py-4">Loading modules...</div>
        ) : (
          visibleModules.map(mod => {
            const active = isActive(mod.href)
            return (
              <button
                key={mod.code}
                onClick={() => handleNav(mod.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base w-6 text-center shrink-0">{mod.emoji}</span>
                <span className="flex-1 text-left truncate">{mod.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
              </button>
            )
          })
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{username}</p>
            <p className={`text-xs truncate ${meta.color}`}>{meta.label}</p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="shrink-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title from active module */}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">
            {visibleModules.find(m => isActive(m.href))?.label ?? 'Dashboard'}
          </span>

          <ThemeToggle />
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default UserLayout
