import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Tag } from 'antd'
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { normalizeCompletedInductionAccess } from '../../utils/accessState'
import AttendanceScanner from '../user/AttendanceScanner'
import ErrorBoundary from './components/QRErrorBoundary'
import { TrainingAttendanceService } from './TrainingAttendanceService'
import { getTrainingTypeMeta } from './trainingTypes'

type UserTraining = {
  id: number
  training_type?: string
  mode?: string
  title: string
  trainer?: string
  training_date?: string
  training_time?: string
  location?: string
  duration_hours?: number
  description?: string
  status?: string
  has_active_qr?: boolean
  my_attendance?: {
    attendance_status?: string
    attendance_method?: string
    verified_by?: string
    completed_at?: string | null
    marked_at?: string | null
  } | null
}

type TrainingState = 'pending' | 'assigned' | 'awaiting_attendance' | 'completed' | 'missed'

const stateMeta: Record<TrainingState, { label: string; color: string; className: string }> = {
  pending: { label: 'Pending', color: 'default', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  assigned: { label: 'Assigned', color: 'processing', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  awaiting_attendance: { label: 'Awaiting Attendance', color: 'warning', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'success', className: 'bg-green-50 text-green-700 border-green-200' },
  missed: { label: 'Missed', color: 'error', className: 'bg-red-50 text-red-700 border-red-200' },
}

const resolveState = (training: UserTraining): TrainingState => {
  const attendance = training.my_attendance?.attendance_status
  if (attendance === 'completed' || attendance === 'present') return 'completed'
  if (attendance === 'absent') return 'missed'
  if (training.has_active_qr) return 'awaiting_attendance'
  if (attendance === 'pending') return 'assigned'
  return 'pending'
}

const formatDateTime = (training: UserTraining) => {
  const date = training.training_date || 'Date pending'
  return training.training_time ? `${date} at ${training.training_time}` : date
}

const UserTrainingDashboard: React.FC = () => {
  const { updateUser } = useAuthStore()
  const [trainings, setTrainings] = useState<UserTraining[]>([])
  const [loading, setLoading] = useState(true)
  const [busyTrainingId, setBusyTrainingId] = useState<number | null>(null)
  const [scannerTraining, setScannerTraining] = useState<UserTraining | null>(null)
  const [detailsTraining, setDetailsTraining] = useState<UserTraining | null>(null)
  const announcedRef = useRef(false)

  const loadTrainings = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const response = await apiClient.get('/api/training/trainings/')
      const data = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
          ? response.data
          : []
      setTrainings(data)

      if (!announcedRef.current) {
        announcedRef.current = true
        if (data.length > 0) toast.success(`${data.length} assigned training${data.length === 1 ? '' : 's'} available`)
        if (data.some((training: UserTraining) => training.has_active_qr && resolveState(training) !== 'completed')) {
          toast.success('QR attendance is ready for one or more trainings')
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not load assigned trainings')
      setTrainings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrainings(true)
    const interval = window.setInterval(() => loadTrainings(false), 30000)
    return () => window.clearInterval(interval)
  }, [loadTrainings])

  const summary = useMemo(() => {
    const counts: Record<TrainingState, number> = {
      pending: 0,
      assigned: 0,
      awaiting_attendance: 0,
      completed: 0,
      missed: 0,
    }
    trainings.forEach(training => { counts[resolveState(training)] += 1 })
    return counts
  }, [trainings])

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
        { timeout: 5000, enableHighAccuracy: true },
      )
    })

  const handleQrScan = async (rawData: string) => {
    if (!scannerTraining) return
    setBusyTrainingId(scannerTraining.id)
    try {
      const gpsLocation = await getGpsLocation()
      const response = await TrainingAttendanceService.markAttendance(rawData, gpsLocation)
      updateUser(normalizeCompletedInductionAccess(response || {}) as any)
      toast.success('Attendance marked')
      if (response?.training_completed) toast.success('Training completed')
      if (response?.access_unlocked || response?.platform_access || response?.modules_unlocked) {
        toast.success('Access unlocked')
      }
      setScannerTraining(null)
      await loadTrainings(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'QR attendance failed')
      setScannerTraining(null)
    } finally {
      setBusyTrainingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Loading assigned trainings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assigned Trainings</h1>
            <p className="mt-1 text-sm text-gray-500">Attend trainings assigned by your administrator and track your attendance status.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['assigned', 'awaiting_attendance', 'completed', 'missed'] as TrainingState[]).map(state => (
              <div key={state} className="rounded-lg border border-gray-200 px-3 py-2 text-center">
                <div className="text-lg font-bold text-gray-900">{summary[state]}</div>
                <div className="text-xs text-gray-500">{stateMeta[state].label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {trainings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">No assigned trainings</h2>
          <p className="mt-2 text-sm text-gray-500">New trainings assigned by your admin will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {trainings.map(training => {
            const state = resolveState(training)
            const stateInfo = stateMeta[state]
            const typeMeta = getTrainingTypeMeta(training.training_type)
            const completed = state === 'completed'
            const canScan = !completed && training.has_active_qr
            const busy = busyTrainingId === training.id

            return (
              <section key={training.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Tag color={typeMeta.color}>{typeMeta.label}</Tag>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stateInfo.className}`}>
                        {stateInfo.label}
                      </span>
                      {training.my_attendance?.attendance_method && (
                        <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          {training.my_attendance.attendance_method.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h2 className="truncate text-xl font-bold text-gray-900">{training.title}</h2>
                  </div>
                  {completed ? <CheckCircle className="h-6 w-6 shrink-0 text-green-600" /> : <Clock className="h-6 w-6 shrink-0 text-amber-500" />}
                </div>

                <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /> {training.trainer || 'Trainer pending'}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {formatDateTime(training)}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {training.location || 'Location pending'}</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gray-400" /> Attendance: {stateInfo.label}</div>
                </div>

                {training.description && (
                  <p className="mt-4 line-clamp-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{training.description}</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button icon={<Eye className="h-4 w-4" />} onClick={() => setDetailsTraining(training)}>
                    View Details
                  </Button>
                  <Button
                    type={canScan ? 'primary' : 'default'}
                    icon={<QrCode className="h-4 w-4" />}
                    disabled={!canScan || busy}
                    loading={busy}
                    onClick={() => setScannerTraining(training)}
                  >
                    {completed ? 'Completed' : canScan ? 'Attend Training' : 'Awaiting QR'}
                  </Button>
                  {canScan && (
                    <Button icon={<QrCode className="h-4 w-4" />} onClick={() => setScannerTraining(training)}>
                      Scan QR
                    </Button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Modal
        title={detailsTraining?.title}
        open={!!detailsTraining}
        onCancel={() => setDetailsTraining(null)}
        footer={<Button onClick={() => setDetailsTraining(null)}>Close</Button>}
      >
        {detailsTraining && (
          <div className="space-y-3 text-sm">
            <p><strong>Type:</strong> {getTrainingTypeMeta(detailsTraining.training_type).label}</p>
            <p><strong>Trainer:</strong> {detailsTraining.trainer || 'Trainer pending'}</p>
            <p><strong>Date:</strong> {formatDateTime(detailsTraining)}</p>
            <p><strong>Location:</strong> {detailsTraining.location || 'Location pending'}</p>
            <p><strong>Status:</strong> {stateMeta[resolveState(detailsTraining)].label}</p>
            {detailsTraining.description && <p><strong>Description:</strong> {detailsTraining.description}</p>}
          </div>
        )}
      </Modal>

      {scannerTraining && (
        <ErrorBoundary>
          <AttendanceScanner
            onScan={handleQrScan}
            onClose={() => setScannerTraining(null)}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}

export default UserTrainingDashboard
