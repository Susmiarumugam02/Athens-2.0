import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, CheckCircle, AlertCircle, LogOut, Calendar, Loader2 } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────
const CHECKIN_THRESHOLD_HOUR = 9   // after 09:00 → Late
const CHECKIN_THRESHOLD_MIN  = 0

// ── Types ─────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | null

interface TodayRecord {
  id: number
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  latitude: number | null
  longitude: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso: string | null) => {
  if (!iso) return '—'
  // iso may be "HH:MM:SS" or full datetime
  const t = iso.includes('T') ? iso.split('T')[1] : iso
  return t.slice(0, 5)
}

const statusMeta: Record<NonNullable<AttendanceStatus>, { label: string; color: string; bg: string }> = {
  present:  { label: 'Present',  color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-100 dark:bg-green-900/30' },
  late:     { label: 'Late',     color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  half_day: { label: 'Half Day', color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  absent:   { label: 'Absent',   color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-100 dark:bg-red-900/30' },
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    })
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuthStore()
  const username = (user as any)?.username || user?.email?.split('@')[0] || 'User'

  const [today] = useState(new Date().toISOString().split('T')[0])
  const [record, setRecord]     = useState<TodayRecord | null>(null)
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [liveTime, setLiveTime] = useState(new Date())

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch today's attendance record for this user
  const fetchToday = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/workforce/attendance/today/')
      setRecord(res.data ?? null)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setRecord(null)
      } else {
        toast.error('Could not load attendance status.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  // ── Location helper ──────────────────────────────────────────────────────
  const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    setLocError(null)
    try {
      const pos = await getCurrentPosition()
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
    } catch (err: any) {
      const msg =
        err?.code === 1
          ? 'Location permission denied. Please enable location access and try again.'
          : err?.code === 2
          ? 'Location unavailable. Please check your device settings.'
          : err?.code === 3
          ? 'Location request timed out. Please try again.'
          : 'Unable to get location. Please enable location and try again.'
      setLocError(msg)
      return null
    }
  }

  // ── Check-in ─────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setBusy(true)
    const loc = await getLocation()
    if (!loc) { setBusy(false); return }

    const now = new Date()
    const isLate =
      now.getHours() > CHECKIN_THRESHOLD_HOUR ||
      (now.getHours() === CHECKIN_THRESHOLD_HOUR && now.getMinutes() > CHECKIN_THRESHOLD_MIN)

    try {
      const res = await apiClient.post('/api/workforce/attendance/', {
        date: today,
        check_in_time: now.toTimeString().slice(0, 8),
        latitude: loc.latitude,
        longitude: loc.longitude,
        status: isLate ? 'late' : 'present',
      })
      setRecord(res.data)
      toast.success(isLate ? 'Checked in — marked Late' : 'Attendance marked — Present!')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to mark attendance.'
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  // ── Check-out ────────────────────────────────────────────────────────────
  const handleCheckOut = async () => {
    if (!record) return
    setBusy(true)
    const loc = await getLocation()
    if (!loc) { setBusy(false); return }

    const now = new Date()
    try {
      const res = await apiClient.patch(`/api/workforce/attendance/${record.id}/checkout/`, {
        check_out_time: now.toTimeString().slice(0, 8),
        latitude: loc.latitude,
        longitude: loc.longitude,
      })
      setRecord(res.data)
      toast.success('Clocked out successfully!')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to clock out.'
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const checkedIn  = !!record?.check_in_time
  const checkedOut = !!record?.check_out_time
  const status     = record?.status ?? null

  const workHours = (() => {
    if (!record?.check_in_time || !record?.check_out_time) return null
    const [ih, im] = record.check_in_time.slice(0, 5).split(':').map(Number)
    const [oh, om] = record.check_out_time.slice(0, 5).split(':').map(Number)
    const mins = (oh * 60 + om) - (ih * 60 + im)
    if (mins <= 0) return null
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {liveTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Live clock card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
          <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white tracking-tight">
            {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {today}
          </div>
          <div className="mt-2 text-sm font-medium text-primary">
            👤 {username}
          </div>
        </div>

        {/* Status card — shown after check-in */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {checkedIn && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Status</span>
                  {status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMeta[status].bg} ${statusMeta[status].color}`}>
                      {statusMeta[status].label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Check-in</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{fmt(record?.check_in_time ?? null)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${checkedOut ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700/40'}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Check-out</p>
                    <p className={`text-lg font-bold ${checkedOut ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400'}`}>
                      {checkedOut ? fmt(record?.check_out_time ?? null) : '—'}
                    </p>
                  </div>
                </div>

                {workHours && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Work hours: <span className="font-semibold text-gray-900 dark:text-white">{workHours}</span>
                  </div>
                )}

                {record?.latitude && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {record.latitude.toFixed(5)}, {record.longitude?.toFixed(5)}
                  </div>
                )}
              </div>
            )}

            {/* Location error banner */}
            {locError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Location Required</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{locError}</p>
                </div>
              </div>
            )}

            {/* Action button */}
            <div className="flex flex-col items-center gap-3">
              {!checkedIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-2xl text-base font-semibold shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                  {busy ? 'Getting location…' : 'Mark Attendance'}
                </button>
              )}

              {checkedIn && !checkedOut && (
                <button
                  onClick={handleCheckOut}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-2xl text-base font-semibold shadow-md hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                  {busy ? 'Getting location…' : 'Clock Out'}
                </button>
              )}

              {checkedIn && checkedOut && (
                <div className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl text-base font-semibold">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Attendance Complete for Today
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">
                {!checkedIn && 'Location will be captured automatically on click.'}
                {checkedIn && !checkedOut && 'Click Clock Out when you leave for the day.'}
                {checkedIn && checkedOut && 'See you tomorrow!'}
              </p>
            </div>
          </>
        )}

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p>📍 Location is required to mark attendance.</p>
          <p>⏰ Check-in after {CHECKIN_THRESHOLD_HOUR}:{String(CHECKIN_THRESHOLD_MIN).padStart(2,'0')} AM is marked as <strong>Late</strong>.</p>
          <p>🕐 No clock-out by end of day is marked as <strong>Half Day</strong>.</p>
        </div>

      </div>
    </div>
  )
}
