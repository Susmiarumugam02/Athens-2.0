import { useState } from 'react'
import { Plus, Search, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, FileText } from 'lucide-react'

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

interface Transaction {
  id: number
  type: 'advance' | 'expense'
  amount: number
  description: string
  category: string
  project: string
  requestedBy: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvalDate?: string
  proofUrl?: string
}

export default function AdvanceExpensesPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'expense',
    status: 'pending'
  })

  const mockTransactions: Transaction[] = [
    {
      id: 1,
      type: 'advance',
      amount: 50000,
      description: 'Material purchase advance',
      category: 'Materials',
      project: 'Solar Installation - ABC Corp',
      requestedBy: 'Rajesh Kumar',
      requestDate: '2025-02-20',
      status: 'approved',
      approvedBy: 'John Doe',
      approvalDate: '2025-02-21'
    },
    {
      id: 2,
      type: 'expense',
      amount: 15000,
      description: 'Transportation charges',
      category: 'Transport',
      project: 'Wind Farm - XYZ Ltd',
      requestedBy: 'Priya Sharma',
      requestDate: '2025-02-22',
      status: 'pending'
    },
    {
      id: 3,
      type: 'expense',
      amount: 8500,
      description: 'Tool rental',
      category: 'Equipment',
      project: 'Solar Installation - ABC Corp',
      requestedBy: 'Amit Patel',
      requestDate: '2025-02-23',
      status: 'approved',
      approvedBy: 'Jane Smith',
      approvalDate: '2025-02-23',
      proofUrl: '/uploads/receipt_001.pdf'
    }
  ]

  const totalAdvances = mockTransactions.filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = mockTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const pendingApprovals = mockTransactions.filter(t => t.status === 'pending').length
  const approvedAmount = mockTransactions.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'advance' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  const filteredTransactions = mockTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.project.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || t.type === filterType
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveTab('list')
    setFormData({ type: 'expense', status: 'pending' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Advance & Expenses</h1>
          </div>
          <p className="text-muted-foreground">Manage advances and expense claims with approval workflow</p>
        </div>
        <button
          onClick={() => setActiveTab('form')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Advances"
          value={`₹${(totalAdvances / 1000).toFixed(0)}K`}
          subtitle="All advances"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-blue-600"
        />
        <KPICard
          title="Total Expenses"
          value={`₹${(totalExpenses / 1000).toFixed(0)}K`}
          subtitle="All expenses"
          icon={<TrendingDown className="h-5 w-5" />}
          color="text-purple-600"
        />
        <KPICard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle="Awaiting review"
          icon={<Clock className="h-5 w-5" />}
          color="text-yellow-600"
        />
        <KPICard
          title="Approved Amount"
          value={`₹${(approvedAmount / 1000).toFixed(0)}K`}
          subtitle="Total approved"
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-green-600"
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
                placeholder="Search transactions..."
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
              <option value="advance">Advances</option>
              <option value="expense">Expenses</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-accent/80"
              >
                <DollarSign className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{transaction.description}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{transaction.project}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Category: {transaction.category}</span>
                    <span>Requested by: {transaction.requestedBy}</span>
                    <span>Date: {transaction.requestDate}</span>
                    {transaction.approvedBy && (
                      <span>Approved by: {transaction.approvedBy}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">₹{transaction.amount.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    {transaction.proofUrl && (
                      <button className="px-3 py-1 bg-accent text-foreground rounded hover:bg-accent/80 text-xs flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Proof
                      </button>
                    )}
                    {transaction.status === 'pending' && (
                      <>
                        <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs">
                          Approve
                        </button>
                        <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">New Request</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type *</label>
                <select
                  required
                  value={formData.type || 'expense'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="advance">Advance</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
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
                  <option value="Materials">Materials</option>
                  <option value="Transport">Transport</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Labor">Labor</option>
                  <option value="Other">Other</option>
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Upload Proof (if expense)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Submit Request
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
