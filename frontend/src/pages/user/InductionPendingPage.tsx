import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { hasCompletedInductionAccess } from '../../utils/accessState'
import InductionTrainingPage from './InductionTrainingPage'
import UserInductionHeader from './UserInductionHeader'
import {
  Building2,
  Check,
  Clock,
  Mail,
  Phone,
  User,
} from 'lucide-react'

const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-gray-900">
    <div className="h-9 w-9 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
  </div>
)

const EmptyState = () => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
    Profile details are still being prepared. Your onboarding status is safe, and this page will continue to be available.
  </div>
)

const getDisplayName = (user: any) =>
  user?.name || user?.full_name || user?.username || user?.email?.split('@')?.[0] || 'Employee'

const formatDate = (value?: string | null) => {
  if (!value) return 'Recorded by system'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recorded by system'
  return date.toLocaleString()
}

const InductionPendingPage: React.FC = () => {
  const { user, updateUser, hydrated, isLoading } = useAuthStore()
  const [statusLoading, setStatusLoading] = useState(false)
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let mounted = true
    const fetchOnboardingStatus = async () => {
      setStatusLoading(true)
      try {
        const response = await apiClient.get('/api/auth/projectadmin/status/')
        if (!mounted) return
        const data = response.data || {}
        updateUser(data as any)
        setEmployeeProfile({ ...(user as any), ...data })
        setFetchError(null)
      } catch (error) {
        console.error('[InductionPendingPage] Failed to fetch onboarding status:', error)
        if (!mounted) return
        setEmployeeProfile(user)
        setFetchError('Live status could not be refreshed. Showing your saved onboarding state.')
      } finally {
        if (mounted) setStatusLoading(false)
      }
    }
    fetchOnboardingStatus()
    return () => { mounted = false }
  }, [user?.id])

  useEffect(() => {
    if (hasCompletedInductionAccess(user)) {
      window.location.href = '/app/dashboard'
    }
  }, [user])

  if (!hydrated || isLoading || !user) return <LoadingScreen />

  const profile = employeeProfile || user
  if (!profile) return <EmptyState />

  const approvalStatus = String((profile as any)?.workflow_approval_status || (profile as any)?.approval_status || '')
  const userStatus = String((profile as any)?.status || '')
  const accessLevel = String((profile as any)?.access_level || '')
  const isApprovedForTraining =
    userStatus === 'approved_pending_induction' ||
    approvalStatus === 'approved' ||
    accessLevel === 'training_only'

  if (isApprovedForTraining) {
    return <InductionTrainingPage />
  }

  if (!(profile as any)?.profile_completed) {
    return <Navigate to="/user/complete-profile" replace />
  }

  const displayName = getDisplayName(profile)
  const submittedAt = (profile as any)?.profile_submitted_at || (profile as any)?.submitted_at || null

  const steps = [
    { label: 'Account Created', state: 'done' },
    { label: 'Profile Submitted', state: 'done' },
    { label: 'Waiting Admin Approval', state: 'current' },
    { label: 'Induction Training', state: 'pending' },
    { label: 'Full Access Activated', state: 'pending' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <UserInductionHeader profile={profile} />
      <div className="mx-auto max-w-5xl px-4 py-6">

        <main className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Submitted Successfully</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Waiting for Admin Approval
                </p>
              </div>
            </div>

            {fetchError && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                {fetchError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <User className="h-4 w-4" /> Employee
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-sm text-gray-500">{(profile as any)?.email || 'Email not available'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <Building2 className="h-4 w-4" /> Department
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{(profile as any)?.department || 'Not provided'}</p>
                <p className="text-sm text-gray-500">{(profile as any)?.designation || 'Designation pending'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <Phone className="h-4 w-4" /> Contact
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{(profile as any)?.phone_number || (profile as any)?.phone || 'Not provided'}</p>
                <p className="text-sm text-gray-500">Employee ID: {(profile as any)?.employee_id || 'Pending'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <Clock className="h-4 w-4" /> Submitted Date
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDate(submittedAt)}</p>
                <p className="text-sm text-gray-500">{statusLoading ? 'Refreshing status...' : 'Current status available'}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">Onboarding Progress</h3>
              <div className="space-y-4">
                {steps.map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                      step.state === 'done'
                        ? 'border-green-600 bg-green-600 text-white'
                        : step.state === 'current'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'
                          : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950'
                    }`}>
                      {step.state === 'done' ? <Check className="h-4 w-4" /> : step.state === 'current' ? '...' : ''}
                    </div>
                    <span className={`text-sm ${step.state === 'pending' ? 'text-gray-500' : 'font-medium text-gray-900 dark:text-white'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Need help?</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Contact your EPC Admin if your review is delayed or profile details need correction.
              </p>
              <a
                href={`mailto:${(profile as any)?.created_by_email || ''}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" /> Contact Admin
              </a>
            </section>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default InductionPendingPage
