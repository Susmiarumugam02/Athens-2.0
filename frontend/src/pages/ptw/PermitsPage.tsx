import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
import { getPermits } from './api'
import toast from 'react-hot-toast'

interface Permit {
  id: number
  permit_number: string
  title: string
  status: string
  permit_type?: { name: string } | null
  location: string
  planned_start_time: string
  planned_end_time: string
}

export default function PermitsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [permits, setPermits] = useState<Permit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPermits()
  }, [searchParams])

  const loadPermits = async () => {
    try {
      setLoading(true)
      const status = searchParams.get('status')
      const params = status ? { status } : {}
      const response = await getPermits(params)
      const permitsList = Array.isArray(response.data) ? response.data : (response.data?.results || [])
      setPermits(permitsList)
    } catch (error) {
      console.error('Failed to load permits:', error)
      toast.error('Failed to load permits')
      setPermits([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-accent rounded w-1/4"></div>
          <div className="h-64 bg-accent rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Work Permits</h1>
        </div>
        <button 
          onClick={() => navigate('/app/ptw/create')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          Create Permit
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-accent">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Permit #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {permits.map(p => (
                <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{p.permit_number}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{p.title}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{p.permit_type?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{p.location}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/app/ptw/permits/${p.id}`)}
                        className="p-1 text-primary hover:bg-accent rounded" 
                        title="View"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="p-1 text-red-600 hover:bg-red-50 rounded" 
                        title="Delete"
                        onClick={() => toast.error('Delete functionality coming soon')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {permits.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">No Permits Found</h3>
            <p className="text-muted-foreground mb-6">Get started by creating your first permit</p>
            <button
              onClick={() => navigate('/app/ptw/create')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create First Permit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
