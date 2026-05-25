/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import UserInductionHeader from './UserInductionHeader'
import AttendanceScanner from './AttendanceScanner'
import { TrainingAttendanceService } from '../training/TrainingAttendanceService'
import ErrorBoundary from '../training/components/QRErrorBoundary'
import { hasCompletedInductionAccess } from '../../utils/accessState'
import toast from 'react-hot-toast'
import {
  CheckCircle, Clock, MapPin, User as UserIcon, Calendar, BookOpen,
  QrCode, KeyRound, Camera, ShieldCheck, Navigation,
  X, Loader2, AlertCircle, PartyPopper,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceMethod = 'qr' | 'otp' | 'admin' | 'geo' | null

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  present:   { label: 'Verified',  cls: 'bg-green-100  text-green-800  border-green-200'  },
  completed: { label: 'Completed', cls: 'bg-blue-100   text-blue-800   border-blue-200'   },
  absent:    { label: 'Rejected',  cls: 'bg-red-100    text-red-800    border-red-200'     },
  expired:   { label: 'Expired',   cls: 'bg-gray-100    text-gray-700   border-gray-200'    },
  approved:  { label: 'Approved',  cls: 'bg-green-100   text-green-800  border-green-200'   },
}

const METHODS = [
  { id: 'qr'    as AttendanceMethod, label: 'Scan QR Code',          icon: <QrCode className="w-5 h-5" />,      desc: 'Scan the QR code displayed by your trainer' },
  { id: 'otp'   as AttendanceMethod, label: 'Enter OTP',              icon: <KeyRound className="w-5 h-5" />,    desc: 'Enter the 6-digit code from your trainer' },
  { id: 'admin' as AttendanceMethod, label: 'Request Admin Approval', icon: <ShieldCheck className="w-5 h-5" />, desc: 'Ask your admin to manually verify attendance' },
  { id: 'geo'   as AttendanceMethod, label: 'Geolocation Check-in',   icon: <Navigation className="w-5 h-5" />,  desc: 'Verify your GPS location at the training site' },
]

// ─── Success Overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 bg-green-600/95 flex flex-col items-center justify-center z-50 text-white text-center p-6">
      <div className="animate-bounce mb-4">
        <PartyPopper className="w-20 h-20" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Induction Training Completed Successfully</h1>
      <p className="text-lg text-green-100 mb-1">Attendance Marked Successfully</p>
      <p className="text-green-100 mb-1">Your induction training has been completed.</p>
      <p className="text-green-100 mb-1">All platform modules are now unlocked.</p>
      <p className="text-green-200 text-sm">Redirecting to your dashboard...</p>
      <div className="mt-6 w-48 h-1.5 bg-green-500 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full animate-[grow_3.5s_linear_forwards]" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserInductionTrainingPage() {
  const { user, updateUser } = useAuthStore()
  const [trainings, setTrainings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTraining, setActiveTraining] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<AttendanceMethod>(null)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [otpValue, setOtpValue] = useState('')

  const hasFullAccess = hasCompletedInductionAccess(user)

  useEffect(() => {
    if (hasFullAccess && !showSuccess) {
      window.location.replace('/app/dashboard')
    }
  }, [hasFullAccess, showSuccess])

  const updateEmployeeAccess = useCallback(async (accessPatch: Record<string, any>) => {
    // updateUser handles all storage writes (Zustand + localStorage + sessionStorage)
    updateUser({
      ...accessPatch,
      status: 'active',
      module_access_enabled: true,
      induction_attended: true,
      onboarding_completed: true,
      training_status: 'completed',
      attendance_status: 'verified',
      access_level: 'full_access',
      access_status: 'active',
      induction_status: 'completed',
      onboarding_status: 'completed',
    } as any)
  }, [updateUser])

  const fetchTrainings = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/training/my-induction/')
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.results) ? res.data.results : [])
      setTrainings(data)
      setLoadError(null)
      const hasCompleted = data.some((t: any) =>
        ['completed', 'present'].includes(t.my_attendance?.attendance_status)
      )
      if (hasCompleted && !hasFullAccess) {
        await updateEmployeeAccess({
          induction_completed: true,
          attendance_verified: true,
          modules_unlocked: true,
          onboarding_completed: true,
          access_status: 'active',
          induction_status: 'completed',
        })
        setShowSuccess(true)
      }
    } catch (e: any) {
      const data = e?.response?.data
      const message = data?.detail || data?.error || e?.message || 'Unable to load assigned induction trainings.'
      console.error('[InductionTraining] fetchTrainings error:', data || e?.message)
      setLoadError(message)
      setTrainings([])
    } finally {
      setLoading(false)
    }
  }, [hasFullAccess, updateEmployeeAccess])

  useEffect(() => {
    fetchTrainings()
    const interval = setInterval(fetchTrainings, 30000)
    return () => clearInterval(interval)
  }, [fetchTrainings])

  const isVerified = (t: any) => ['completed', 'present'].includes(t.my_attendance?.attendance_status)

  const openMethod = (trainingId: number, method: AttendanceMethod) => {
    setActiveTraining(trainingId)
    setSelectedMethod(method)
    setFeedback(null)
    setOtpValue('')
    if (method === 'qr') setShowQrScanner(true)
  }

  const closeModal = () => {
    setActiveTraining(null)
    setSelectedMethod(null)
    setFeedback(null)
    setShowQrScanner(false)
  }

  const handleVerifySuccess = useCallback(async (accessPayload: Record<string, any> = {}) => {
    await updateEmployeeAccess({
      ...accessPayload,
      induction_completed: true,
      attendance_verified: true,
      modules_unlocked: true,
      onboarding_completed: true,
      access_status: 'active',
      induction_status: 'completed',
    })
    setTrainings(current => current.map(training => (
      training.id === activeTraining
        ? {
            ...training,
            attendance_marked: true,
            display_status: 'completed',
            my_attendance: {
              ...(training.my_attendance || {}),
              attendance_status: 'completed',
              attendance_method: 'qr',
              completed_at: new Date().toISOString(),
            },
          }
        : training
    )))
    toast.success('Attendance marked. Redirecting to dashboard...')
    setShowQrScanner(false)
    setShowSuccess(true)
    // SuccessOverlay.onDone fires after 1500ms and calls window.location.replace
  }, [activeTraining, updateEmployeeAccess])

  const getGpsLocation = () =>
    new Promise<Record<string, number | null>>((resolve) => {
      if (!navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => resolve({}),
        { timeout: 5000, enableHighAccuracy: true }
      )
    })

  // ── QR scan callback ──────────────────────────────────────────────────────
  const handleQrScan = useCallback(async (rawData: string) => {
    // activeTraining MUST be set before the scanner opens — it is the authoritative training ID.
    // We never fall back to the QR payload's training_id to prevent cross-training QR reuse.
    if (!activeTraining) {
      setShowQrScanner(false)
      setFeedback({ type: 'error', msg: 'No training session selected. Please select a training and try again.' })
      return
    }

    // Validate that the scanned QR payload's training_id matches the selected training
    try {
      const parsed = JSON.parse(rawData)
      const payloadTrainingId = parsed?.training_id
      if (payloadTrainingId != null && Number(payloadTrainingId) !== activeTraining) {
        setShowQrScanner(false)
        setFeedback({ type: 'error', msg: 'This QR belongs to another training. Please scan the correct QR code.' })
        return
      }
    } catch {
      // rawData is a bare token — backend will validate binding
    }

    setBusy(true)
    try {
      const gpsLocation = await getGpsLocation()
      // Always use the scoped endpoint with the URL-level training ID
      const response = await TrainingAttendanceService.verifyQr(activeTraining, rawData, gpsLocation)
      await handleVerifySuccess(response || {})
    } catch (e: any) {
      setShowQrScanner(false)
      const errMsg = e?.response?.data?.error || e?.message || 'QR verification failed'
      setFeedback({ type: 'error', msg: errMsg })
    } finally {
      setBusy(false)
    }
  }, [activeTraining, handleVerifySuccess])

  // ── OTP ───────────────────────────────────────────────────────────────────
  const submitOtp = async () => {
    if (otpValue.length !== 6) return setFeedback({ type: 'error', msg: 'Enter a 6-digit OTP' })
    setBusy(true)
    try {
      await apiClient.post(`/api/training/trainings/${activeTraining}/verify-otp/`, { otp: otpValue })
      await handleVerifySuccess()
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.response?.data?.error || 'OTP verification failed' })
    } finally {
      setBusy(false)
    }
  }

  // ── Admin request ─────────────────────────────────────────────────────────
  const submitAdminRequest = async () => {
    setBusy(true)
    try {
      await apiClient.post(`/api/training/trainings/${activeTraining}/request-admin-verification/`)
      setFeedback({ type: 'success', msg: 'Request sent. Your admin will mark your attendance.' })
      setTimeout(closeModal, 2200)
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.response?.data?.error || 'Request failed' })
    } finally {
      setBusy(false)
    }
  }

  // ── Geolocation ───────────────────────────────────────────────────────────
  const submitGeo = async () => {
    if (!navigator.geolocation) return setFeedback({ type: 'error', msg: 'Geolocation not supported' })
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiClient.post(`/api/training/trainings/${activeTraining}/verify-geolocation/`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
          await handleVerifySuccess()
        } catch (e: any) {
          setFeedback({ type: 'error', msg: e.response?.data?.error || 'Location verification failed' })
        } finally {
          setBusy(false)
        }
      },
      () => {
        setFeedback({ type: 'error', msg: 'Could not get location. Allow GPS access and retry.' })
        setBusy(false)
      },
      { timeout: 10000 }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {showSuccess && (
        <SuccessOverlay onDone={() => { window.location.replace('/app/dashboard') }} />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserInductionHeader profile={user} />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Induction Training</h1>
                <p className="text-gray-600 mt-1">Mark your attendance to unlock full platform access</p>
              </div>
            </div>
          </div>

          {/* Training cards */}
          {loadError ? (
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Training could not be loaded</h2>
              <p className="text-gray-500 text-sm">{loadError}</p>
              <button
                type="button"
                onClick={fetchTrainings}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : trainings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Training Assigned Yet</h2>
              <p className="text-gray-500 text-sm">Your administrator will assign a session soon. This page refreshes every 30 seconds.</p>
            </div>
          ) : (
            trainings.map((training: any) => {
              const verified = isVerified(training)
              const attStatus = training.my_attendance?.attendance_status || 'pending'
              const attMethod = training.my_attendance?.attendance_method
              const displayStatus = training.display_status || attStatus || 'pending'
              const badge = STATUS_BADGE[displayStatus] || STATUS_BADGE[attStatus] || STATUS_BADGE.pending
              const hasActiveQr = Boolean(training.qr_enabled ?? training.has_active_qr)
              const attendanceMarked = Boolean(training.attendance_marked || verified)
              const showQrAttendance = displayStatus === 'pending' && !attendanceMarked && hasActiveQr

              return (
                <div key={training.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Banner */}
                  {verified ? (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <span className="text-white font-medium">Attendance Verified — Full Access Granted</span>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-white" />
                      <span className="text-white font-medium">Attendance Required to Unlock Platform</span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">{training.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {[
                        { icon: <Calendar className="w-5 h-5 text-gray-400" />, label: 'Date', value: training.training_date },
                        { icon: <UserIcon className="w-5 h-5 text-gray-400" />, label: 'Trainer', value: training.trainer },
                        { icon: <MapPin className="w-5 h-5 text-gray-400" />, label: 'Location', value: training.location },
                        { icon: <BookOpen className="w-5 h-5 text-gray-400" />, label: 'Mode', value: training.mode === 'online' ? 'Online' : 'Offline' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                          {item.icon}
                          <div>
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className="text-sm font-medium text-gray-900">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {training.description && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
                        <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Training Instructions</p>
                        {training.description}
                      </div>
                    )}

                    {/* QR active indicator */}
                    {showQrAttendance && (
                      <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        <QrCode className="w-4 h-4 shrink-0" />
                        <span><strong>QR code is active.</strong> Tap "Scan QR Code" below to mark attendance instantly.</span>
                      </div>
                    )}

                    {/* Verified */}
                    {verified && (
                      <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-medium">
                          ✅ Attendance Completed{attMethod ? ` via ${attMethod.toUpperCase()}` : ''}
                        </p>
                        <p className="text-sm text-green-800 font-medium">
                          ✅ Platform Access Granted
                        </p>
                      </div>
                    )}

                    {/* QR attendance only for employees */}
                    {!attendanceMarked && (
                      <div className="relative space-y-3">
                        <button
                          onClick={() => openMethod(training.id, 'qr')}
                          disabled={!showQrAttendance || busy}
                          className="w-full flex items-center justify-between px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          <span className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Scan QR & Mark Attendance
                          </span>
                          <QrCode className="w-4 h-4" />
                        </button>

                        {!showQrAttendance && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            {displayStatus === 'expired'
                              ? 'This training session is no longer active. Contact your administrator for a new session.'
                              : 'Waiting for your admin to display the training QR code.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pending admin notice */}
                    {!verified && attStatus === 'pending' && attMethod === 'admin' && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        ⏳ Admin verification requested. Waiting for approval.
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Need Help?</h3>
            <p className="text-sm text-gray-600">Contact your administrator if you have questions about your induction training.</p>
          </div>
        </div>
      </div>

      {/* ── QR Camera Scanner ── */}
      {showQrScanner && activeTraining && (
        <ErrorBoundary>
          <AttendanceScanner
            onScan={handleQrScan}
            onClose={() => { setShowQrScanner(false); setSelectedMethod(null); setActiveTraining(null) }}
          />
        </ErrorBoundary>
      )}

      {/* ── OTP / Admin / Geo Modal ── */}
      {activeTraining && selectedMethod && selectedMethod !== 'qr' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {METHODS.find(m => m.id === selectedMethod)?.label}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {feedback && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
                  feedback.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {feedback.type === 'success'
                    ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  {feedback.msg}
                </div>
              )}

              {selectedMethod === 'otp' && (
                <>
                  <p className="text-sm text-gray-600">Enter the 6-digit OTP provided by your trainer.</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-xl py-4 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={submitOtp}
                    disabled={busy || otpValue.length !== 6}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify OTP
                  </button>
                </>
              )}

              {selectedMethod === 'admin' && (
                <>
                  <p className="text-sm text-gray-600">
                    Send a request to your admin to manually verify your attendance. They will approve it from the attendance panel.
                  </p>
                  <button
                    onClick={submitAdminRequest}
                    disabled={busy}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Verification Request
                  </button>
                </>
              )}

              {selectedMethod === 'geo' && (
                <>
                  <p className="text-sm text-gray-600">
                    Allow location access to verify you are at the training site. Ensure GPS is enabled.
                  </p>
                  <button
                    onClick={submitGeo}
                    disabled={busy}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Navigation className="w-4 h-4" />
                    Check My Location
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
