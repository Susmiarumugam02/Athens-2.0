import type { User } from '../types'

export function hasCompletedInductionAccess(user: User | null | undefined): boolean {
  if (!user) return false

  const raw = user as any
  const inductionDone = raw.induction_completed === true || raw.induction_attended === true || raw.induction_status === 'completed'
  const attendanceDone = raw.attendance_verified === true || raw.attendance_status === 'verified'
  const modulesEnabled = raw.modules_unlocked === true || raw.module_access_enabled === true
  const onboardingDone = raw.onboarding_completed === true || raw.onboarding_status === 'completed'
  const activeAccess = raw.access_status === 'active' || raw.status === 'active' || raw.access_level === 'full_access'

  return inductionDone && attendanceDone && modulesEnabled && (activeAccess || onboardingDone)
}

export function normalizeCompletedInductionAccess<T extends Record<string, any>>(user: T): T {
  if (!hasCompletedInductionAccess(user as User)) return user

  return {
    ...user,
    induction_completed: true,
    induction_attended: true,
    module_access_enabled: true,
    attendance_verified: true,
    modules_unlocked: true,
    access_status: 'active',
    onboarding_completed: true,
    induction_status: 'completed',
    onboarding_status: 'completed',
    training_status: 'completed',
    attendance_status: 'verified',
    access_level: 'full_access',
    status: 'active',
  }
}
