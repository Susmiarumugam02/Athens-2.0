import { useState, useEffect } from 'react'
import { workforceApi } from '../../services/workforceApi'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    workforceApi.getTasks()
      .then(res => setTasks(res.data))
      .catch(err => )
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <div className="bg-white rounded-lg shadow p-4">
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t: any) => (
              <li key={t.id} className="border-b pb-2">
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-gray-600">{t.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
