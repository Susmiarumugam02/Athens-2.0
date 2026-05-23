/**
 * Sidebar Module Filter
 * Filters sidebar menu items based on training completion status
 */

export interface MenuItem {
  name: string
  path: string
  icon?: any
  children?: MenuItem[]
  requiresTraining?: boolean
}

const RESTRICTED_MODULES = [
  'attendance',
  'ptw',
  'permit-to-work',
  'incident',
  'safety-observation',
  'quality',
  'inspection',
  'financial',
  'manpower',
  'mom',
  'chatbox',
  'ai-bot',
  'leave',
  'payroll',
  'followups',
  'daily-planner',
  'ergon',
  'workforce',
  'tbt',
  'contractor-compliance'
]

const ALWAYS_ACCESSIBLE = [
  'dashboard',
  'training',
  'profile',
  'settings',
  'logout'
]

/**
 * Check if a module requires training completion
 */
export function requiresTraining(modulePath: string): boolean {
  const moduleName = modulePath.split('/')[1] || modulePath
  return RESTRICTED_MODULES.some(restricted => 
    moduleName.toLowerCase().includes(restricted.toLowerCase())
  )
}

/**
 * Check if a module is always accessible
 */
export function isAlwaysAccessible(modulePath: string): boolean {
  const moduleName = modulePath.split('/')[1] || modulePath
  return ALWAYS_ACCESSIBLE.some(accessible => 
    moduleName.toLowerCase().includes(accessible.toLowerCase())
  )
}

/**
 * Filter menu items based on training status
 */
export function filterMenuByTraining(
  menuItems: MenuItem[],
  trainingCompleted: boolean,
  isAdmin: boolean = false
): MenuItem[] {
  // Admins see everything
  if (isAdmin) {
    return menuItems
  }

  // If training completed, show everything
  if (trainingCompleted) {
    return menuItems
  }

  // Filter out restricted modules
  return menuItems.filter(item => {
    // Check if item is always accessible
    if (isAlwaysAccessible(item.path)) {
      return true
    }

    // Check if item requires training
    if (requiresTraining(item.path)) {
      return false
    }

    // If item has children, filter them recursively
    if (item.children && item.children.length > 0) {
      item.children = filterMenuByTraining(item.children, trainingCompleted, isAdmin)
      return item.children.length > 0
    }

    return true
  })
}

/**
 * Add lock indicators to restricted modules
 */
export function addLockIndicators(
  menuItems: MenuItem[],
  trainingCompleted: boolean,
  isAdmin: boolean = false
): MenuItem[] {
  if (isAdmin || trainingCompleted) {
    return menuItems
  }

  return menuItems.map(item => {
    const isRestricted = requiresTraining(item.path)
    
    return {
      ...item,
      locked: isRestricted,
      lockMessage: isRestricted ? 'Complete induction training to unlock' : undefined,
      children: item.children 
        ? addLockIndicators(item.children, trainingCompleted, isAdmin)
        : undefined
    }
  })
}
