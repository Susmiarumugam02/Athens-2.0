import { useState } from 'react'
import { Plus, Search, Users, Truck, Calendar, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; isUp: boolean }
  onClick?: () => void
  color?: string
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, trend, onClick, color = 'text-primary' }) => (
  <div
    onClick={onClick}
    className={`bg-card border border-border rounded-xl p-3 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-accent ${color}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
    <div className="text-xs font-medium text-foreground mb-0.5">{title}</div>
    {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
  </div>
)

interface Resource {
  id: number
  type: 'manpower' | 'machinery'
  name: string
  category: string
  project: string
  location: string
  allocationDate: string
  status: 'active' | 'idle' | 'maintenance'
  cost: number
  utilization: number
}

export default function ManpowerMachineryPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<Partial<Resource>>({
    type: 'manpower',
    status: 'active'
  })

  const mockResources: Resource[] = [
    {
      id: 1,
      type: 'manpower',
      name: 'Electrician Team A',
      category: 'Skilled Labor',
      project: 'Solar Installation - ABC Corp',
      location: 'Site A - Mumbai',
      allocationDate: '2025-02-01',
      status: 'active',
      cost: 25000,
      utilization: 85
    },
    {
      id: 2,
      type: 'machinery',
      name: 'Excavator JCB-001',
      category: 'Heavy Equipment',
      project: 'Wind Farm - XYZ Ltd',
      location: 'Site B - Pune',
      allocationDate: '2025-02-10',
      status: 'active',
      cost: 15000,
      utilization: 92
    },
    {
      id: 3,
      type: 'manpower',
      name: 'Welding Team B',
      category: 'Skilled Labor',
      project: 'Solar Installation - ABC Corp',
      location: 'Site A - Mumbai',
      allocationDate: '2025-02-15',
      status: 'active',
      cost: 30000,
      utilization: 78
    }
  ]

  const totalManpower = mockResources.filter(r => r.type === 'manpower').length
  const totalMachinery = mockResources.filter(r => r.type === 'machinery').length
  const activeResources = mockResources.filter(r => r.status === 'active').length
  const avgUtilization = Math.round(
    mockResources.reduce((sum, r) => sum + r.utilization, 0) / mockResources.length
  )
  const totalCost = mockResources.reduce((sum, r) => sum + r.cost, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'manpower' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600'
    if (utilization >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredResources = mockResources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.project.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || r.type === filterType
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveTab('list')
    setFormData({ type: 'manpower', status: 'active' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Manpower & Machinery</h1>
          </div>
          <p className="text-muted-foreground">Resource allocation and utilization tracking</p>
        </div>
        <button
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Allocate Resource
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          title="Manpower"
          value={totalManpower}
          subtitle="Teams allocated"
          icon={<Users className="h-5 w-5" />}
          color="text-blue-600"
        />
        <KPICard
          title="Machinery"
          value={totalMachinery}
          subtitle="Equipment allocated"
          icon={<Truck className="h-5 w-5" />}
          color="text-purple-600"
        />
        <KPICard
          title="Active"
          value={activeResources}
          subtitle="Currently working"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600"
        />
        <KPICard
          title="Avg Utilization"
          value={`${avgUtilization}%`}
          subtitle="Overall efficiency"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600"
        />
        <KPICard
          title="Total Cost"
          value={`₹${(totalCost / 1000).toFixed(0)}K`}
          subtitle="Monthly"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <div className="bg-card border border-border rounded-xl p-6">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="manpower">Manpower</option>
              <option value="machinery">Machinery</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Resources List */}
          <div className="space-y-3">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80"
              >
                {resource.type === 'manpower' ? (
                  <Users className="w-5 h-5 text-primary" />
                ) : (
                  <Truck className="w-5 h-5 text-primary" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{resource.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(resource.type)}`}>
                      {resource.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(resource.status)}`}>
                      {resource.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{resource.category}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {resource.location}
                    </span>
                    <span>{resource.project}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Allocated: {resource.allocationDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Utilization:</span>
                    <span className={`text-xs font-semibold ${getUtilizationColor(resource.utilization)}`}>
                      {resource.utilization}%
                    </span>
                    <div className="flex-1 max-w-xs bg-background rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          resource.utilization >= 80 ? 'bg-green-500' :
                          resource.utilization >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${resource.utilization}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">₹{resource.cost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs">
                      Edit
                    </button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">
                      Deallocate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">Allocate Resource</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type *</label>
                <select
                  required
                  value={formData.type || 'manpower'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="manpower">Manpower</option>
                  <option value="machinery">Machinery</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                <select
                  required
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Category</option>
                  <option value="Skilled Labor">Skilled Labor</option>
                  <option value="Unskilled Labor">Unskilled Labor</option>
                  <option value="Heavy Equipment">Heavy Equipment</option>
                  <option value="Light Equipment">Light Equipment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Project *</label>
                <select
                  required
                  value={formData.project || ''}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Project</option>
                  <option value="Solar Installation - ABC Corp">Solar Installation - ABC Corp</option>
                  <option value="Wind Farm - XYZ Ltd">Wind Farm - XYZ Ltd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Allocation Date *</label>
                <input
                  type="date"
                  required
                  value={formData.allocationDate || ''}
                  onChange={(e) => setFormData({ ...formData, allocationDate: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Monthly Cost (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
                <select
                  required
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Allocate Resource
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
