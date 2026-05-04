import { Users } from 'lucide-react'

export default function WorkforcePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workforce</h1>
          <p className="text-gray-600 dark:text-gray-400">HR Management System</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Profile Management</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Employee profiles, documents, and records</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Attendance System</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track employee attendance and shifts</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Leave Management</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Leave requests, approvals, and balances</p>
        </div>
      </div>
    </div>
  )
}
