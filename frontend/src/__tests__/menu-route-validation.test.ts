import { describe, it, expect } from 'vitest'
import { getAllMenuPaths } from '../components/layout/menuConfig'
import { ROUTE_PATHS } from '../lib/router'

describe('Menu/Route Validation', () => {
  it('should ensure every menu item path exists in router', () => {
    const menuPaths = getAllMenuPaths()
    const routePaths = [...ROUTE_PATHS]
    
    const missingRoutes: string[] = []
    
    menuPaths.forEach(menuPath => {
      // Check exact match or wildcard match (for dynamic routes)
      const hasRoute = routePaths.some(routePath => 
        routePath === menuPath || 
        routePath.includes('*') && menuPath.startsWith(routePath.replace('/*', ''))
      )
      
      if (!hasRoute) {
        missingRoutes.push(menuPath)
      }
    })
    
    if (missingRoutes.length > 0) {
      throw new Error(
        `Menu items point to non-existent routes:\n${missingRoutes.join('\n')}\n\n` +
        `Add these routes to router.tsx or remove from menuConfig.ts`
      )
    }
    
    expect(missingRoutes).toHaveLength(0)
  })
})