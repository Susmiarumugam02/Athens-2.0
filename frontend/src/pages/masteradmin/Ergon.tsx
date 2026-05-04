import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProjectSelector from '../../components/masteradmin/ProjectSelector'
import { useProjectContext } from '../../store/projectContext'

export default function ErgonPage() {
  const { selectedProject } = useProjectContext()

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-yellow-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ERGON</h1>
          <p className="text-gray-600 dark:text-gray-400">Operations & Finance Management</p>
        </div>
      </div>

      <ProjectSelector />

      {!selectedProject ? (
        <div className="text-center py-12 text-gray-500">
          Please select a project to access ERGON modules
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Managing ERGON for: <strong>{selectedProject.name}</strong>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/master-admin/ergon/daily-planner" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Daily Planner</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">SLA timers, task execution, rollover</p>
            </Link>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Task Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Tasks, follow-ups, and tracking</p>
            </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Advance & Expenses</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track advances and expense claims</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Manpower & Machinery</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Resource allocation and management</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Financial Ledger</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Accounts, transactions, and reports</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Projects</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Project tracking and management</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Customers & Invoices</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Customer management and billing</p>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
