import { useState } from 'react'
import { Search, DollarSign, TrendingUp, TrendingDown, FileText, Download, Filter } from 'lucide-react'

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

interface LedgerEntry {
  id: number
  date: string
  project: string
  category: string
  type: 'debit' | 'credit'
  amount: number
  description: string
  reference: string
  balance: number
}

export default function FinancialLedgerPage() {
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const mockLedger: LedgerEntry[] = [
    {
      id: 1,
      date: '2025-02-01',
      project: 'Solar Installation - ABC Corp',
      category: 'Revenue',
      type: 'credit',
      amount: 500000,
      description: 'Project advance received',
      reference: 'INV-2025-001',
      balance: 500000
    },
    {
      id: 2,
      date: '2025-02-05',
      project: 'Solar Installation - ABC Corp',
      category: 'Materials',
      type: 'debit',
      amount: 150000,
      description: 'Solar panel purchase',
      reference: 'PO-2025-045',
      balance: 350000
    },
    {
      id: 3,
      date: '2025-02-10',
      project: 'Wind Farm - XYZ Ltd',
      category: 'Revenue',
      type: 'credit',
      amount: 750000,
      description: 'Milestone payment',
      reference: 'INV-2025-002',
      balance: 1100000
    },
    {
      id: 4,
      date: '2025-02-12',
      project: 'Solar Installation - ABC Corp',
      category: 'Labor',
      type: 'debit',
      amount: 80000,
      description: 'Monthly wages',
      reference: 'PAY-2025-023',
      balance: 1020000
    }
  ]

  const projects = ['Solar Installation - ABC Corp', 'Wind Farm - XYZ Ltd']
  const categories = ['Revenue', 'Materials', 'Labor', 'Equipment', 'Transport']

  const filteredLedger = mockLedger.filter(entry => {
    const matchesProject = selectedProject === 'all' || entry.project === selectedProject
    const matchesType = filterType === 'all' || entry.type === filterType
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesProject && matchesType && matchesCategory && matchesSearch
  })

  const totalCredit = filteredLedger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0)
  const totalDebit = filteredLedger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0)
  const netBalance = totalCredit - totalDebit

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Financial Ledger</h1>
          </div>
          <p className="text-muted-foreground">Project-wise accounting and transaction history</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Credit"
          value={`₹${(totalCredit / 100000).toFixed(1)}L`}
          subtitle="Income"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600"
        />
        <KPICard
          title="Total Debit"
          value={`₹${(totalDebit / 100000).toFixed(1)}L`}
          subtitle="Expenses"
          icon={<TrendingDown className="h-5 w-5" />}
          color="text-red-600"
        />
        <KPICard
          title="Net Balance"
          value={`₹${(Math.abs(netBalance) / 100000).toFixed(1)}L`}
          subtitle={netBalance >= 0 ? 'Surplus' : 'Deficit'}
          icon={<DollarSign className="h-5 w-5" />}
          color={netBalance >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <KPICard
          title="Transactions"
          value={filteredLedger.length}
          subtitle="Total entries"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Project</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Reference</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Debit</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Credit</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLedger.map((entry) => (
                <tr key={entry.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.date}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{entry.project}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-accent text-foreground rounded text-xs">
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{entry.description}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{entry.reference}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {entry.type === 'debit' ? (
                      <span className="text-red-600 font-semibold">₹{entry.amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {entry.type === 'credit' ? (
                      <span className="text-green-600 font-semibold">₹{entry.amount.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-bold ${entry.balance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                      ₹{entry.balance.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-accent border-t-2 border-primary">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-foreground">
                  Totals:
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className="text-red-600 font-bold">₹{totalDebit.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className="text-green-600 font-bold">₹{totalCredit.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`font-bold text-lg ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{netBalance.toLocaleString()}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
