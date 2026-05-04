import React from 'react'
import { Clock } from 'lucide-react'

const AthensPendingApproval: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <Clock className="h-10 w-10 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Pending Approval</h1>
        <p className="text-sm text-gray-600 mt-2">
          Your profile has been submitted and is awaiting approval from your Project Admin.
        </p>
        <p className="text-sm text-gray-600 mt-2">You'll receive access once approved.</p>
      </div>
    </div>
  )
}

export default AthensPendingApproval
