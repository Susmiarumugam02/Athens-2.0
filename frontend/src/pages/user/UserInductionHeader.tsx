/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import logo from '../../assets/logo.jpeg'

const displayName = (user: any) =>
  user?.name || user?.full_name || user?.username || user?.email?.split('@')?.[0] || 'Employee'

const employeeId = (user: any) =>
  user?.employee_id || user?.employee_code || user?.id || 'Pending'

const statusText = (user: any) =>
  String(user?.approval_status || user?.workflow_approval_status || user?.status || 'pending')
    .replace(/_/g, ' ')

const statusClass = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized.includes('approved') || normalized.includes('active')) {
    return 'border-green-200 bg-green-50 text-green-700'
  }
  if (normalized.includes('reject')) {
    return 'border-red-200 bg-red-50 text-red-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export default function UserInductionHeader({ profile }: { profile?: any }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const activeProfile = profile || user || {}
  const status = statusText(activeProfile)

  useEffect(() => {
    if (!profileOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [profileOpen])

  const handleLogout = () => {
    logout()
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Athens 2.0" className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Athens 2.0</p>
            <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">Induction Training Portal</h1>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center lg:min-w-[420px]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(activeProfile)}</p>
            <p className="text-xs text-gray-500">Employee ID: {employeeId(activeProfile)}</p>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>
            {status}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <button
            type="button"
            aria-label="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden max-w-32 truncate sm:inline">{displayName(activeProfile)}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(activeProfile)}</p>
                <p className="truncate text-xs text-gray-500">{activeProfile?.email || 'Email not available'}</p>
                <div className="mt-3 rounded-md bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                  <div>Employee ID: {employeeId(activeProfile)}</div>
                  <div className="capitalize">Status: {status}</div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
