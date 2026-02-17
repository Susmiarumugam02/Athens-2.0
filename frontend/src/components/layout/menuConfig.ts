import { 
  LayoutDashboard, Users, FileText, Settings, Bell, Shield, Lock,
  FolderOpen, Menu, Briefcase, UserCheck, ClipboardList, 
  Calendar, AlertTriangle, BookOpen, HardHat, Eye, 
  CheckSquare, MessageSquare, Mic, Bot
} from 'lucide-react'

export type MenuRole = 'superadmin' | 'masteradmin' | 'companyuser'

export interface MenuItem {
  label: string
  description?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: MenuRole[]
}

// Athens original application menu structure
const ATHENS_MENU_ITEMS: MenuItem[] = [
  // Core modules
  { label: 'Dashboard', description: 'Overview and metrics', href: '/dashboard', icon: LayoutDashboard, roles: ['superadmin', 'masteradmin', 'companyuser'] },
  { label: 'Projects', description: 'Manage projects', href: '/projects', icon: FolderOpen, roles: ['masteradmin', 'companyuser'] },
  
  // Safety & Compliance
  { label: 'PTW', description: 'Permit to Work', href: '/ptw', icon: FileText, roles: ['companyuser'] },
  { label: 'Incident Management', description: 'Report and track incidents', href: '/incident-management', icon: AlertTriangle, roles: ['companyuser'] },
  { label: 'Safety Observation', description: 'Safety observations', href: '/safety-observation', icon: Eye, roles: ['companyuser'] },
  { label: 'Quality', description: 'Quality management', href: '/quality', icon: CheckSquare, roles: ['companyuser'] },
  { label: 'Inspection', description: 'Inspection management', href: '/inspection', icon: ClipboardList, roles: ['companyuser'] },
  
  // Training & Development
  { label: 'Induction Training', description: 'Employee induction', href: '/induction-training', icon: BookOpen, roles: ['companyuser'] },
  { label: 'Job Training', description: 'Job-specific training', href: '/job-training', icon: HardHat, roles: ['companyuser'] },
  { label: 'TBT', description: 'Tool Box Talk', href: '/tbt', icon: MessageSquare, roles: ['companyuser'] },
  
  // Workforce Management
  { label: 'Manpower', description: 'Workforce planning', href: '/manpower', icon: Users, roles: ['companyuser'] },
  { label: 'Worker', description: 'Worker management', href: '/worker', icon: UserCheck, roles: ['companyuser'] },
  { label: 'Attendance', description: 'Attendance tracking', href: '/attendance', icon: Calendar, roles: ['companyuser'] },
  
  // Communication & AI
  { label: 'MOM', description: 'Minutes of Meeting', href: '/mom', icon: FileText, roles: ['companyuser'] },
  { label: 'Chatbox', description: 'Team communication', href: '/chatbox', icon: MessageSquare, roles: ['companyuser'] },
  { label: 'Voice Translator', description: 'Multi-language support', href: '/voice-translator', icon: Mic, roles: ['companyuser'] },
  { label: 'AI Bot', description: 'AI assistance', href: '/ai-bot', icon: Bot, roles: ['companyuser'] },
  
  // Administration (MasterAdmin)
  { label: 'Admin Users', description: 'Manage admin users', href: '/admin-users', icon: Users, roles: ['masteradmin'] },
  { label: 'Menu Management', description: 'Configure modules', href: '/menu-management', icon: Menu, roles: ['masteradmin'] },
  
  // System Administration (SuperAdmin)
  { label: 'Users', description: 'Manage SuperAdmin users', href: '/users', icon: Users, roles: ['superadmin'] },
  { label: 'Roles', description: 'Roles and permissions', href: '/roles', icon: Shield, roles: ['superadmin'] },
  { label: 'Security', description: 'Security policies', href: '/security', icon: Lock, roles: ['superadmin'] },
  { label: 'Tenants', description: 'Manage tenant companies', href: '/tenants', icon: FileText, roles: ['superadmin'] },
  { label: 'Subscriptions', description: 'Billing and plans', href: '/subscriptions', icon: FileText, roles: ['superadmin'] },
  { label: 'Masters', description: 'Manage master accounts', href: '/masters', icon: Users, roles: ['superadmin'] },
  { label: 'Audit Logs', description: 'Platform activity trail', href: '/audit-logs', icon: FileText, roles: ['superadmin'] },
  { label: 'Configuration', description: 'System configuration', href: '/configuration', icon: Settings, roles: ['superadmin'] },
  { label: 'Notifications', description: 'Announcements & alerts', href: '/notifications', icon: Bell, roles: ['superadmin'] },
  
  // Common
  { label: 'Settings', description: 'Account settings', href: '/settings', icon: Settings, roles: ['superadmin', 'masteradmin', 'companyuser'] },
]

export function getMenuForRole(role: MenuRole, pathPrefix: string = ''): MenuItem[] {
  return ATHENS_MENU_ITEMS
    .filter(item => item.roles.includes(role))
    .map(item => ({
      ...item,
      href: pathPrefix + item.href
    }))
}

export const menuByRole = {
  superadmin: (pathPrefix = '/superadmin') => getMenuForRole('superadmin', pathPrefix),
  masteradmin: (pathPrefix = '/master-admin') => getMenuForRole('masteradmin', pathPrefix),
  companyuser: (pathPrefix = '') => getMenuForRole('companyuser', pathPrefix),
}

// Export all menu paths for CI validation
export function getAllMenuPaths(): string[] {
  const allPaths = new Set<string>()
  
  // Collect paths from all roles with their prefixes
  Object.entries(menuByRole).forEach(([role, getMenu]) => {
    const prefix = role === 'superadmin' ? '/superadmin' : 
                   role === 'masteradmin' ? '/master-admin' : ''
    getMenu(prefix).forEach(item => allPaths.add(item.href))
  })
  
  return Array.from(allPaths).sort()
}