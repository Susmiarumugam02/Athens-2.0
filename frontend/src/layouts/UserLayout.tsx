import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../lib/api'
import { LogOut, Bell, Menu, X, ChevronRight, CheckCircle, Lock, User as UserIcon, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { hasCompletedInductionAccess } from '../utils/accessState'

const ALL_MODULES = [
  { code: 'dashboard',            label: 'Dashboard',         href: '/user/dashboard',           emoji: '🏠' },
  { code: 'ptw',                  label: 'Permit to Work',    href: '/app/ptw',                  emoji: '📋' },
  { code: 'incident',             label: 'Incident Mgmt',     href: '/app/incident-management',  emoji: '⚠️' },
  { code: 'safety',               label: 'Safety Observation',href: '/app/safety-observation',   emoji: '👁️' },
  { code: 'quality',              label: 'Quality',           href: '/app/quality',              emoji: '✔️' },
  { code: 'inspection',           label: 'Inspection',        href: '/app/inspection',           emoji: '🔍' },
  { code: 'training',             label: 'Training',          href: '/app/training',             emoji: '📚' },
  { code: 'tbt',                  label: 'TBT',               href: '/app/tbt',                  emoji: '🛡️' },
  { code: 'ergon_tasks',          label: 'Task Management',   href: '/app/ergon/tasks',          emoji: '✅' },
  { code: 'ergon_planner',        label: 'Daily Planner',     href: '/app/ergon/planner',        emoji: '📅' },
  { code: 'ergon_followups',      label: 'Follow-ups',        href: '/app/ergon/followups',      emoji: '🔔' },
  { code: 'ergon_advance',        label: 'Advance/Expenses',  href: '/app/ergon/advance',        emoji: '💳' },
  { code: 'ergon_manpower',       label: 'Manpower/Machinery',href: '/app/ergon/manpower',       emoji: '👷' },
  { code: 'ergon_ledger',         label: 'Financial Ledger',  href: '/app/ergon/ledger',         emoji: '💰' },
  { code: 'workforce_attendance', label: 'Attendance',        href: '/app/workforce/attendance', emoji: '🕐' },
  { code: 'workforce_leave',      label: 'Leave Management',  href: '/app/workforce/leave',      emoji: '🏖️' },
  { code: 'mom',                  label: 'MoM',               href: '/app/mom',                  emoji: '📝' },
  { code: 'chatbox',              label: 'Chatbox',           href: '/app/chatbox',              emoji: '💬' },
  { code: 'voice_translator',     label: 'Voice Translator',  href: '/app/voice-translator',     emoji: '🎙️' },
  { code: 'ai_bot',               label: 'AI Bot',            href: '/app/ai-bot',               emoji: '🤖' },
  { code: 'change_password',      label: 'Change Password',   href: '/app/settings/change-password', emoji: '🔒' },
]

const COMPANY_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  client:     { label: 'Client User',     color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-900/30' },
  epc:        { label: 'EPC User',        color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-100 dark:bg-green-900/30' },
  contractor: { label: 'Contractor User', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
}

// ── Extracted as a stable top-level component so it never causes Outlet to remount ──
interface SidebarProps {
  visibleModules: typeof ALL_MODULES
  enabledCodes: string[] | null
  pendingInduction: boolean
  username: string
  meta: { label: string; color: string; bg: string }
  currentPath: string
  onNav: (href: string) => void
  onLogout: () => void
}

const SidebarContent: React.FC<SidebarProps> = ({
  visibleModules, enabledCodes, pendingInduction, username, meta, currentPath, onNav, onLogout,
}) => {
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(href + '/')

  return (
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
        {enabledCodes === null && !pendingInduction ? (
          <div className="text-xs text-gray-400 px-3 py-4">Loading modules...</div>
        ) : (
          visibleModules.map(mod => {
            const active = isActive(mod.href)
            return (
              <button
                key={mod.code}
                onClick={() => onNav(mod.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
          <button onClick={onLogout} title="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const UserLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enabledCodes, setEnabledCodes] = useState<string[] | null>(null)
  const [showActivatedPopup, setShowActivatedPopup] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Show activation popup only when status transitions TO 'active' during this session
  const prevStatusRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currentStatus = (user as any)?.status
    if (prevStatusRef.current !== undefined &&
        prevStatusRef.current !== 'active' &&
        currentStatus === 'active') {
      setShowActivatedPopup(true)
      const t = setTimeout(() => setShowActivatedPopup(false), 6000)
      return () => clearTimeout(t)
    }
    prevStatusRef.current = currentStatus
  }, [(user as any)?.status])

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch enabled modules once
  useEffect(() => {
    const projectId = (user as any)?.project_id
    if (!projectId) {
      setEnabledCodes([])
      return
    }
    apiClient.get(`/api/control-plane/project-modules/?project_id=${projectId}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
        setEnabledCodes(data.filter((m: any) => m.is_enabled).map((m: any) => m.module_code as string))
      })
      .catch(() => setEnabledCodes([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const companyType = (user as any)?.company_type || 'client'
  const meta = COMPANY_TYPE_META[companyType] || COMPANY_TYPE_META.client
  const username = (user as any)?.username || user?.email?.split('@')[0] || 'User'
  const hasFullAccess = hasCompletedInductionAccess(user)
  const pendingInduction = !hasFullAccess
  const isAutogeneratedPassword = !!(user as any)?.is_autogenerated_password

  // Password reminder banner — shown once per session after induction completion
  const [showPasswordBanner, setShowPasswordBanner] = useState(false)
  useEffect(() => {
    if (hasFullAccess && isAutogeneratedPassword) {
      const dismissed = sessionStorage.getItem('pw_banner_dismissed')
      if (!dismissed) setShowPasswordBanner(true)
    }
  }, [hasFullAccess, isAutogeneratedPassword])

  const dismissPasswordBanner = () => {
    sessionStorage.setItem('pw_banner_dismissed', '1')
    setShowPasswordBanner(false)
  }

  const visibleModules = pendingInduction
      ? [
        { code: 'training', label: 'Induction Training', href: '/user/induction-training', emoji: '📚' },
        { code: 'profile', label: 'Profile', href: '/user/complete-profile', emoji: '👤' },
        { code: 'change_password', label: 'Change Password', href: '/app/settings/change-password', emoji: '🔒' },
      ]
    : hasFullAccess
      ? ALL_MODULES.filter(m => {
          // Dashboard and Change Password always visible
          if (m.code === 'dashboard' || m.code === 'change_password') return true
          if (enabledCodes === null) return false
          if (enabledCodes.length === 0) return true
          return enabledCodes.includes(m.code)
        })
      : []

  const handleNav = (href: string) => { navigate(href); setSidebarOpen(false) }
  const handleLogout = () => { logout(); navigate('/login') }

  const sidebarProps: SidebarProps = {
    visibleModules,
    enabledCodes,
    pendingInduction,
    username,
    meta,
    currentPath: location.pathname,
    onNav: handleNav,
    onLogout: handleLogout,
  }

  const activeLabel = visibleModules.find(
    m => location.pathname === m.href || location.pathname.startsWith(m.href + '/')
  )?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Access Activated Popup */}
      {showActivatedPopup && (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-green-200 dark:border-green-800 p-5 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">✅ Induction Training Completed</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Your account is now fully activated. All platform modules are now accessible.
              </p>
            </div>
            <button onClick={() => setShowActivatedPopup(false)} className="text-gray-400 hover:text-gray-600 ml-2 text-xl leading-none">×</button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent {...sidebarProps} />
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
              <SidebarContent {...sidebarProps} />
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
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">
            {activeLabel}
          </span>
          <ThemeToggle />
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <Bell className="h-4 w-4" />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {username[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                {username}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{username}</p>
                  <p className={`text-xs truncate ${meta.color}`}>{meta.label}</p>
                </div>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/app/settings/change-password') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <Lock className="h-4 w-4 text-gray-400" />
                  Change Password
                  {isAutogeneratedPassword && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                      Required
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); handleLogout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Password reminder banner */}
        {showPasswordBanner && (
          <div className="shrink-0 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-3">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Your password was auto-generated. Please change it for security.
            </p>
            <button
              onClick={() => { dismissPasswordBanner(); navigate('/app/settings/change-password') }}
              className="shrink-0 text-xs font-semibold bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Change Now
            </button>
            <button
              onClick={dismissPasswordBanner}
              className="shrink-0 text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              Remind Later
            </button>
          </div>
        )}

        {/* Content — Outlet must never be conditionally unmounted */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default UserLayout
