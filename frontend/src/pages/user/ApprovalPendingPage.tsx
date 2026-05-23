import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Building2, Check, Clock, LogOut, Mail, ShieldCheck, User } from 'lucide-react'

const formatDate = (value?: string | null) => {
  if (!value) return 'Recorded by system'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recorded by system' : date.toLocaleString()
}

const ApprovalPendingPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout, hydrated, isLoading } = useAuthStore()

  if (!hydrated || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-gray-900">
        <div className="h-9 w-9 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    )
  }

  const displayName = (user as any)?.name || (user as any)?.username || user.email?.split('@')[0] || 'Employee'
  const steps = [
    { label: 'Account Created', state: 'done' },
    { label: 'Profile Submitted', state: 'done' },
    { label: 'Waiting Admin Approval', state: 'current' },
    { label: 'Induction Training', state: 'pending' },
    { label: 'Full Access Activated', state: 'pending' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Athens 2.0 EHS Platform</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile Submitted Successfully</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </header>

        <main className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your profile is waiting for EPC Admin approval.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  You will receive induction training access after approval. Until then, dashboard and operational modules remain locked.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <User className="h-4 w-4" /> Employee
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-sm text-gray-500">{user.email || 'Email not available'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                  <Building2 className="h-4 w-4" /> Department
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{(user as any)?.department || 'Not provided'}</p>
                <p className="text-sm text-gray-500">{(user as any)?.designation || 'Designation pending'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800 sm:col-span-2">
                <p className="text-xs font-medium uppercase text-gray-500">Submitted Date</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatDate((user as any)?.profile_submitted_at)}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">Onboarding Progress</h3>
              <div className="space-y-4">
                {steps.map(step => (
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

            <a
              href={`mailto:${(user as any)?.created_by_email || ''}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" /> Contact Admin
            </a>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default ApprovalPendingPage
