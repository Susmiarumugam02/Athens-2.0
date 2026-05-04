import React from 'react'
import { Navigate } from 'react-router-dom'
import { useEnabledModules } from '../../hooks/useEnabledModules'

interface ServiceGuardProps {
  moduleCode: string
  children: React.ReactNode
}

/**
 * Wraps a route and redirects to /permission-denied if:
 * - Subscription is inactive, OR
 * - The required module is not in the tenant's enabled list
 *
 * Shows nothing while loading to avoid flash.
 */
const ServiceGuard: React.FC<ServiceGuardProps> = ({ moduleCode, children }) => {
  const { loading, subscriptionActive, isModuleEnabled } = useEnabledModules()

  if (loading) return null

  if (!subscriptionActive || !isModuleEnabled(moduleCode)) {
    return <Navigate to="/permission-denied" replace />
  }

  return <>{children}</>
}

export default ServiceGuard
