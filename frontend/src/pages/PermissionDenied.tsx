import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ShieldAlert } from 'lucide-react'

const PermissionDenied: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <ShieldAlert className="w-20 h-20 mx-auto text-red-500 mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Permission Denied
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          You don't have permission to access this resource.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PermissionDenied
