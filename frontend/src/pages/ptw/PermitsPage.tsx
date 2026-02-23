import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'

interface Permit {
  id: number
  permit_number: string
  title: string
  status: string
  permit_type: { name: string }
  location: string
  planned_start_time: string
  planned_end_time: string
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    
    fetch('/api/ptw/permits/', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then(data => {
        const permitsList = Array.isArray(data) ? data : (data.results || [])
        setPermits(permitsList)
        setLoading(false)
      })
      .catch(() => {
        setPermits([])
        setLoading(false)
      })
  }, [token])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Work Permits</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permit #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permits.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{p.permit_number}</td>
                  <td className="px-6 py-4 text-sm">{p.title}</td>
                  <td className="px-6 py-4 text-sm">{p.permit_type.name}</td>
                  <td className="px-6 py-4 text-sm">{p.location}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {permits.length === 0 && <div className="p-8 text-center text-gray-500">No permits found</div>}
        </div>
      </div>
    </div>
  )
}
