import { useState, useEffect } from 'react'
import { ergonApi } from '../../services/ergonApi'
import { useProjectContext } from '../../store/projectContext'
import { useNavigate } from 'react-router-dom'

interface DailyTask {
  id: number
  title: string
  description: string
  status: string
  priority: string
  progress: number
  start_time: string | null
  sla_end_time: string | null
  active_seconds: number
  pause_duration: number
  scheduled_date: string
}

export default function DailyPlannerPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const { selectedProject } = useProjectContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedProject) {
      navigate('/master-admin/ergon')
      return
    }
    loadTasks()
  }, [selectedDate, selectedProject])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const response = await ergonApi.getDailyTasks(selectedDate)
      setTasks(response.data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTask = async (id: number) => {
    try {
      await ergonApi.startTask(id.toString())
      loadTasks()
    } catch (error) {
      console.error('Failed to start task:', error)
    }
  }

  const handlePauseTask = async (id: number) => {
    try {
      await ergonApi.pauseTask(id.toString())
      loadTasks()
    } catch (error) {
      console.error('Failed to pause task:', error)
    }
  }

  const handleResumeTask = async (id: number) => {
    try {
      await ergonApi.resumeTask(id.toString())
      loadTasks()
    } catch (error) {
      console.error('Failed to resume task:', error)
    }
  }

  const handleCompleteTask = async (id: number) => {
    try {
      await ergonApi.completeTask(id.toString(), { progress: 100 })
      loadTasks()
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handlePostponeTask = async (id: number) => {
    const newDate = prompt('Enter new date (YYYY-MM-DD):')
    if (!newDate) return
    
    try {
      await ergonApi.postponeTask(id.toString(), { new_date: newDate })
      loadTasks()
    } catch (error) {
      console.error('Failed to postpone task:', error)
    }
  }

  const handleRollover = async () => {
    try {
      await ergonApi.rolloverTasks()
      loadTasks()
    } catch (error) {
      console.error('Failed to rollover tasks:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'bg-gray-500',
      in_progress: 'bg-blue-500',
      on_break: 'bg-yellow-500',
      completed: 'bg-green-500',
      postponed: 'bg-orange-500',
      rolled_over: 'bg-purple-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6">
      {selectedProject && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Project: <strong>{selectedProject.name}</strong>
          </p>
        </div>
      )}
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Daily Planner</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleRollover}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Rollover Tasks
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tasks for this date</div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getStatusBadge(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  )}
                  {task.progress > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Time Used:</span>
                  <span className="ml-2 font-medium">{formatTime(task.active_seconds)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Break Time:</span>
                  <span className="ml-2 font-medium">{formatTime(task.pause_duration)}</span>
                </div>
                {task.sla_end_time && (
                  <div>
                    <span className="text-gray-500">SLA End:</span>
                    <span className="ml-2 font-medium">
                      {new Date(task.sla_end_time).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {task.status === 'not_started' && (
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Start
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handlePauseTask(task.id)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Pause
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Complete
                    </button>
                  </>
                )}
                {task.status === 'on_break' && (
                  <button
                    onClick={() => handleResumeTask(task.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Resume
                  </button>
                )}
                {task.status !== 'completed' && task.status !== 'postponed' && (
                  <button
                    onClick={() => handlePostponeTask(task.id)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Postpone
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
