import React, { Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useServiceUserStore } from '../store/serviceUserStore'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import AthensAccessGuard from '../components/auth/AthensAccessGuard'

// Export all route paths for CI validation
export const ROUTE_PATHS = [
  '/login', '/2fa', '/auth/2fa',
  '/superadmin/dashboard', '/superadmin/users', '/superadmin/roles', '/superadmin/security',
  '/superadmin/tenants', '/superadmin/masters', '/superadmin/subscriptions', '/superadmin/audit-logs',
  '/superadmin/configuration', '/superadmin/notifications', '/superadmin/settings',
  '/master-admin', '/master-admin/projects', '/master-admin/admin-users', 
  '/master-admin/menu-management', '/master-admin/settings',
  '/app', '/company/detailed-info', '/company/waiting-approval', '/company/services',
  '/company', '/company/athens/password-reset', '/company/athens/profile',
  '/company/athens/pending-approval', '/company/athens/induction',
  '/service', '/employee', '/jobs', '/services/finance/dashboard',
  '/services/finance/purchase-orders', '/services/hr/dashboard', '/services/inventory/dashboard',
  '/services/crm', '/services/sustainability/dashboard', '/services/dashboard',
  '/services/procurement/dashboard', '/services/analytics/dashboard',
  '/unauthorized', '/permission-denied'
] as const

// Lazy load components
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'))
const TwoFactorPage = React.lazy(() => import('../pages/auth/TwoFactorPage'))

// Layouts
import SuperadminLayout from '../layouts/SuperadminLayout'
import MasterAdminLayout from '../layouts/MasterAdminLayout'
import CompanyLayout from '../layouts/CompanyLayout'

// Superadmin
const SuperadminDashboard = React.lazy(() => import('../pages/superadmin/Dashboard'))
const SuperadminUsers = React.lazy(() => import('../pages/superadmin/Users/UsersList'))
const SuperadminRoles = React.lazy(() => import('../pages/superadmin/Roles/RolesList'))
const SuperadminSecurity = React.lazy(() => import('../pages/superadmin/Security/SecurityCenter'))
const SuperadminAuditLogs = React.lazy(() => import('../pages/superadmin/AuditLogs/AuditLogsList'))
const SuperadminSettings = React.lazy(() => import('../pages/superadmin/Settings'))
const SuperadminConfiguration = React.lazy(() => import('../pages/superadmin/Configuration'))
const SuperadminNotifications = React.lazy(() => import('../pages/superadmin/Notifications/NotificationsCenter'))
const SuperadminServices = React.lazy(() => import('../pages/superadmin/Services'))
const TenantsPage = React.lazy(() => import('../pages/superadmin/Tenants'))
const MastersPage = React.lazy(() => import('../pages/superadmin/Masters'))
const SubscriptionsPage = React.lazy(() => import('../pages/superadmin/Subscriptions'))

// Master Admin
const MasterAdminDashboard = React.lazy(() => import('../pages/masteradmin/Dashboard'))
const MasterAdminProjects = React.lazy(() => import('../pages/masteradmin/Projects'))
const MasterAdminProjectModules = React.lazy(() => import('../pages/masteradmin/ProjectModules'))
const MasterAdminAdminUsers = React.lazy(() => import('../pages/masteradmin/AdminUsers'))
const MasterAdminMenuManagement = React.lazy(() => import('../pages/masteradmin/MenuManagement'))
const MasterAdminSettings = React.lazy(() => import('../pages/masteradmin/Settings'))
const MasterAdminServices = React.lazy(() => import('../pages/masteradmin/Services'))
const MasterAdminErgon = React.lazy(() => import('../pages/masteradmin/Ergon'))
// ERGON Components
const ErgonLanding = React.lazy(() => import('../pages/ergon/ErgonLandingPage'))
const TaskManagement = React.lazy(() => import('../pages/ergon/TaskManagementPage'))
const DailyPlanner = React.lazy(() => import('../pages/ergon/DailyPlannerPage'))
const { FollowupsPage, AdvanceExpensesPage, ManpowerMachineryPage, FinancialLedgerPage } = await import('../pages/ergon/ErgonComponents')

// Workforce Components
const WorkforceLanding = React.lazy(() => import('../pages/workforce/WorkforceLandingPage'))
const { ProfileManagementPage, AttendancePage, LeaveManagementPage } = await import('../pages/workforce/WorkforceComponents')



// Company
const CompanyDashboard = React.lazy(() => import('../pages/company/DashboardSimple'))
const CompanySettings = React.lazy(() => import('../pages/company/CompanySettings'))
const DetailedInfoForm = React.lazy(() => import('../pages/company/DetailedInfoForm'))
const AthensFirstLoginPasswordReset = React.lazy(() => import('../pages/company/AthensFirstLoginPasswordReset'))
const AthensProfileCompletion = React.lazy(() => import('../pages/company/AthensProfileCompletion'))
const AthensPendingApproval = React.lazy(() => import('../pages/company/AthensPendingApproval'))
const AthensInductionPending = React.lazy(() => import('../pages/company/AthensInductionPending'))
const ServiceSelection = React.lazy(() => import('../pages/company/ServiceSelection'))
const FinanceDashboard = React.lazy(() => import('../pages/services/finance/pages/Dashboard'))
const PurchaseOrders = React.lazy(() => import('../pages/services/finance/pages/PurchaseOrders'))
const HRDashboard = React.lazy(() => import('../pages/services/hr/pages/Dashboard'))
const InventoryDashboard = React.lazy(() => import('../pages/services/inventory/pages/Dashboard'))
const CRMRoutes = React.lazy(() => import('../pages/services/crm/index'))
const WaitingApproval = React.lazy(() => import('../pages/company/WaitingApproval'))
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'))
const PermissionDenied = React.lazy(() => import('../pages/PermissionDenied'))
const EmployeeApp = React.lazy(() => import('../pages/EmployeeApp'))
const JobPortal = React.lazy(() => import('../pages/public/JobPortal'))
const JobApplication = React.lazy(() => import('../pages/public/JobApplication'))
const PublicJobDetail = React.lazy(() => import('../pages/public/PublicJobDetail'))

// DEV-ONLY Routes
const SapUiPreview = import.meta.env.DEV ? React.lazy(() => import('../pages/__dev__/SapUiPreview')) : null

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
  requireMasterAdmin?: boolean
  requireCompanyUser?: boolean
  requireApproved?: boolean
  requireServiceUser?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSuperAdmin = false,
  requireMasterAdmin = false,
  requireCompanyUser = false,
  requireApproved = false,
  requireServiceUser = false,
}) => {
  const { isAuthenticated, user, firstLoginRequired, approvalPending, isLoading } = useAuthStore()
  const { isAuthenticated: isServiceUserAuthenticated, serviceUser } = useServiceUserStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  React.useEffect(() => {
    if (requireServiceUser) {
      const sessionKey = sessionStorage.getItem('service_session_key')
      if (!sessionKey) {
        try {
          const storeData = localStorage.getItem('service-user-storage')
          if (storeData) {
            const parsed = JSON.parse(storeData)
            const storeSessionKey = parsed?.state?.sessionKey
            if (storeSessionKey) {
              sessionStorage.setItem('service_session_key', storeSessionKey)
              return
            }
          }
        } catch (error) {
          console.warn('Failed to restore session in ProtectedRoute:', error)
        }
        window.location.replace('/login')
      }
    }
  }, [requireServiceUser])

  if (requireServiceUser) {
    if (!isServiceUserAuthenticated || !serviceUser) {
      const sessionKey = sessionStorage.getItem('service_session_key')
      if (!sessionKey) {
        try {
          const storeData = localStorage.getItem('service-user-storage')
          if (storeData) {
            const parsed = JSON.parse(storeData)
            const storeSessionKey = parsed?.state?.sessionKey
            if (storeSessionKey && parsed?.state?.serviceUser) {
              sessionStorage.setItem('service_session_key', storeSessionKey)
              return <>{children}</>
            }
          }
        } catch (error) {
          console.warn('Failed to restore session in ProtectedRoute render:', error)
        }
      }
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  if (!isAuthenticated || !user) {
    const has2FACredentials = sessionStorage.getItem('2fa_credentials')
    if (has2FACredentials) {
      return <Navigate to="/auth/2fa" replace />
    }
    return <Navigate to="/login" replace />
  }

  // Check user type from user object
  const userType = (user as any).user_type

  if (requireSuperAdmin && userType !== 'superadmin') {
    return <Navigate to="/permission-denied" replace />
  }

  if (requireMasterAdmin && userType !== 'masteradmin') {
    return <Navigate to="/permission-denied" replace />
  }

  if (requireCompanyUser && userType !== 'companyuser') {
    return <Navigate to="/permission-denied" replace />
  }

  if (userType === 'companyuser' && firstLoginRequired && window.location.pathname !== '/company/detailed-info') {
    return <Navigate to="/company/detailed-info" replace />
  }

  if (userType === 'companyuser' && approvalPending && requireApproved && window.location.pathname !== '/company/waiting-approval') {
    return <Navigate to="/company/waiting-approval" replace />
  }

  return <>{children}</>
}

// Public Route Component
interface PublicRouteProps {
  children: React.ReactNode
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()

  // Auto-redirect based on user type
  useEffect(() => {
    if (isAuthenticated && user && window.location.pathname === '/') {
      const userType = (user as any).user_type
      const nextRoute = sessionStorage.getItem('next_route')
      
      // Clear the next_route to prevent loops
      sessionStorage.removeItem('next_route')
      
      if (nextRoute && nextRoute !== '/services/athens_sustainability/dashboard') {
        window.location.href = nextRoute
      } else if (userType === 'superadmin') {
        window.location.href = '/superadmin/dashboard'
      } else if (userType === 'masteradmin') {
        window.location.href = '/master-admin'
      } else if (userType === 'companyuser') {
        window.location.href = '/app'
      } else if (userType === 'serviceuser') {
        window.location.href = '/service'
      }
    }
  }, [isAuthenticated, user])

  if (window.location.pathname === '/auth/2fa' || window.location.pathname === '/2fa') {
    return <>{children}</>
  }

  if (window.location.pathname === '/login') {
    return <>{children}</>
  }

  return <>{children}</>
}

// Loading wrapper
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  }>
    {children}
  </Suspense>
)

export const AppRouter: React.FC = () => {
  // DEV-ONLY routes
  const devRoutes = import.meta.env.DEV && SapUiPreview ? [
    <Route
      key="sap-ui-preview"
      path="/__dev__/sap-ui"
      element={
        <SuspenseWrapper>
          <SapUiPreview />
        </SuspenseWrapper>
      }
    />
  ] : [];

  return (
    <Routes>
      {/* DEV-ONLY Routes */}
      {devRoutes}

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <SuspenseWrapper>
              <LoginPage />
            </SuspenseWrapper>
          </PublicRoute>
        }
      />

      <Route
        path="/2fa"
        element={
          <PublicRoute>
            <SuspenseWrapper>
              <TwoFactorPage />
            </SuspenseWrapper>
          </PublicRoute>
        }
      />

      <Route
        path="/auth/2fa"
        element={
          <PublicRoute>
            <SuspenseWrapper>
              <TwoFactorPage />
            </SuspenseWrapper>
          </PublicRoute>
        }
      />

      {/* Superadmin Routes */}
      <Route path="/superadmin" element={
        <ProtectedRoute requireSuperAdmin>
          <SuperadminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<SuspenseWrapper><SuperadminDashboard /></SuspenseWrapper>} />
        <Route path="users" element={<SuspenseWrapper><SuperadminUsers /></SuspenseWrapper>} />
        <Route path="roles" element={<SuspenseWrapper><SuperadminRoles /></SuspenseWrapper>} />
        <Route path="security" element={<SuspenseWrapper><SuperadminSecurity /></SuspenseWrapper>} />
        <Route path="tenants" element={<SuspenseWrapper><TenantsPage /></SuspenseWrapper>} />
        <Route path="services" element={<SuspenseWrapper><SuperadminServices /></SuspenseWrapper>} />
        <Route path="masters" element={<SuspenseWrapper><MastersPage /></SuspenseWrapper>} />
        <Route path="subscriptions" element={<SuspenseWrapper><SubscriptionsPage /></SuspenseWrapper>} />
        <Route path="audit-logs" element={<SuspenseWrapper><SuperadminAuditLogs /></SuspenseWrapper>} />
        <Route path="configuration" element={<SuspenseWrapper><SuperadminConfiguration /></SuspenseWrapper>} />
        <Route path="notifications" element={<SuspenseWrapper><SuperadminNotifications /></SuspenseWrapper>} />
        <Route path="settings" element={<SuspenseWrapper><SuperadminSettings /></SuspenseWrapper>} />
      </Route>

      {/* Master Admin Routes */}
      <Route path="/master-admin" element={
        <ProtectedRoute requireMasterAdmin>
          <MasterAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuspenseWrapper><MasterAdminDashboard /></SuspenseWrapper>} />
        <Route path="dashboard" element={<SuspenseWrapper><MasterAdminDashboard /></SuspenseWrapper>} />
        <Route path="analytics" element={<SuspenseWrapper><MasterAdminDashboard /></SuspenseWrapper>} />
        <Route path="projects" element={<SuspenseWrapper><MasterAdminProjects /></SuspenseWrapper>} />
        <Route path="projects/:projectId/modules" element={<SuspenseWrapper><MasterAdminProjectModules /></SuspenseWrapper>} />
        <Route path="admin-users" element={<SuspenseWrapper><MasterAdminAdminUsers /></SuspenseWrapper>} />
        <Route path="menu-management" element={<SuspenseWrapper><MasterAdminMenuManagement /></SuspenseWrapper>} />
        <Route path="settings" element={<SuspenseWrapper><MasterAdminSettings /></SuspenseWrapper>} />
      </Route>



      {/* Company User Routes */}
      <Route path="/app" element={
        <ProtectedRoute requireCompanyUser requireApproved>
          <CompanyLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuspenseWrapper><CompanyDashboard /></SuspenseWrapper>} />
        <Route path="dashboard" element={<SuspenseWrapper><CompanyDashboard /></SuspenseWrapper>} />
        <Route path="settings" element={<SuspenseWrapper><CompanySettings /></SuspenseWrapper>} />
        
        {/* ERGON Category Routes */}
        <Route path="ergon" element={<SuspenseWrapper><ErgonLanding /></SuspenseWrapper>} />
        <Route path="ergon/tasks" element={<SuspenseWrapper><TaskManagement /></SuspenseWrapper>} />
        <Route path="ergon/planner" element={<SuspenseWrapper><DailyPlanner /></SuspenseWrapper>} />
        <Route path="ergon/followups" element={<SuspenseWrapper><FollowupsPage /></SuspenseWrapper>} />
        <Route path="ergon/advance" element={<SuspenseWrapper><AdvanceExpensesPage /></SuspenseWrapper>} />
        <Route path="ergon/manpower" element={<SuspenseWrapper><ManpowerMachineryPage /></SuspenseWrapper>} />
        <Route path="ergon/ledger" element={<SuspenseWrapper><FinancialLedgerPage /></SuspenseWrapper>} />
        
        {/* Workforce Category Routes */}
        <Route path="workforce" element={<SuspenseWrapper><WorkforceLanding /></SuspenseWrapper>} />
        <Route path="workforce/profiles" element={<SuspenseWrapper><ProfileManagementPage /></SuspenseWrapper>} />
        <Route path="workforce/attendance" element={<SuspenseWrapper><AttendancePage /></SuspenseWrapper>} />
        <Route path="workforce/leave" element={<SuspenseWrapper><LeaveManagementPage /></SuspenseWrapper>} />
        
        <Route path="settings" element={<SuspenseWrapper><MasterAdminSettings /></SuspenseWrapper>} />
      </Route>

      <Route
        path="/company/detailed-info"
        element={
          <ProtectedRoute requireCompanyUser>
            <SuspenseWrapper>
              <DetailedInfoForm />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/waiting-approval"
        element={
          <ProtectedRoute requireCompanyUser>
            <SuspenseWrapper>
              <WaitingApproval />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/services"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <SuspenseWrapper>
              <ServiceSelection />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <SuspenseWrapper>
              <CompanyDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/password-reset"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensFirstLoginPasswordReset />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/profile"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensProfileCompletion />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/pending-approval"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensPendingApproval />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/induction"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensInductionPending />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      {/* Service Routes */}
      <Route
        path="/service"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-blue-600 mb-4">Service Dashboard</h1>
                  <p className="text-gray-600">Service dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Employee Mobile App */}
      <Route
        path="/employee"
        element={
          <SuspenseWrapper>
            <EmployeeApp />
          </SuspenseWrapper>
        }
      />

      {/* Public Job Portal Routes */}
      <Route
        path="/jobs"
        element={
          <SuspenseWrapper>
            <JobPortal />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/jobs/:jobId"
        element={
          <SuspenseWrapper>
            <PublicJobDetail />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/jobs/:jobId/apply"
        element={
          <SuspenseWrapper>
            <JobApplication />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/public/jobs/:jobId"
        element={
          <SuspenseWrapper>
            <PublicJobDetail />
          </SuspenseWrapper>
        }
      />

      {/* Service Dashboards - Protected */}
      <Route
        path="/services/finance/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <FinanceDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/finance/purchase-orders"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <PurchaseOrders />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/hr/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <HRDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/inventory/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <InventoryDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* CRM Service Routes - Protected */}
      <Route
        path="/services/crm/*"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <CRMRoutes />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Athens Sustainability Routes - Remove redirect loop */}
      <Route
        path="/services/athens_sustainability/*"
        element={
          <ProtectedRoute requireCompanyUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-green-600 mb-4">Athens Sustainability</h1>
                  <p className="text-gray-600">Athens Sustainability module coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Athens Sustainability Dashboard */}
      <Route
        path="/services/sustainability/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-green-600 mb-4">Athens Sustainability Dashboard</h1>
                  <p className="text-gray-600">Athens Sustainability Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Generic Services Dashboard - redirect to appropriate service */}
      <Route
        path="/services/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-blue-600 mb-4">Service Dashboard</h1>
                  <p className="text-gray-600">Please select a specific service from your dashboard.</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/procurement/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-orange-600 mb-4">Procurement Dashboard</h1>
                  <p className="text-gray-600">Procurement Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/analytics/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-indigo-600 mb-4">Analytics Dashboard</h1>
                  <p className="text-gray-600">Business Analytics Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      <Route
        path="/unauthorized"
        element={
          <SuspenseWrapper>
            <PermissionDenied />
          </SuspenseWrapper>
        }
      />

      <Route
        path="/permission-denied"
        element={
          <SuspenseWrapper>
            <PermissionDenied />
          </SuspenseWrapper>
        }
      />

      <Route
        path="*"
        element={
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        }
      />
    </Routes>
  )
}
