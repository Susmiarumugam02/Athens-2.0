import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users, Search, RotateCcw,
  CheckCircle, XCircle, Mail, Building2
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { athensSustAdminApi, type AthensMasterUser } from '../../../services/athensSustAdminApi'
import { DataTableShell, TableToolbar, TableEmptyState } from '@/components/table'
import { Input } from '@/components/ui/Input'

const AthensMastersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: masters, isLoading: mastersLoading } = useQuery({
    queryKey: ['athens-masters'],
    queryFn: () => athensSustAdminApi.fetchMasters(),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: athensSustAdminApi.resetMasterPassword,
    onSuccess: () => {
      toast.success('Password reset email sent successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password')
    }
  })

  const mastersData = masters?.results || []

  const filteredMasters = mastersData.filter((master) =>
    master.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    master.user_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    master.user_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    master.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleResetPassword = (master: AthensMasterUser) => {
    if (confirm(`Send password reset email to ${master.user_email}?`)) {
      resetPasswordMutation.mutate(master.id)
    }
  }

  const getStatusIcon = (master: AthensMasterUser) => {
    if (master.last_login_at) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-gray-400" />
  }

  return (
    <DataTableShell
        title="Masters Management"
        subtitle="Company users who availed Athens Sustainability service"
        count={filteredMasters?.length || 0}
        toolbar={
          <TableToolbar
            left={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search masters by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            }
          />
        }
        emptyState={
          mastersLoading ? null : filteredMasters.length === 0 ? (
            <TableEmptyState
              icon={<Users className="h-12 w-12 text-gray-400" />}
              title="No masters found"
              description="No company users have availed Athens Sustainability service yet"
            />
          ) : null
        }
      >
        {mastersLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMasters.map((master) => (
              <div key={master.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="relative">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {master.user_first_name.charAt(0).toUpperCase()}{master.user_last_name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        master.last_login_at ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {master.user_first_name} {master.user_last_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          master.last_login_at 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300'
                        }`}>
                          {getStatusIcon(master)}
                          <span className="ml-1">{master.last_login_at ? 'Active' : 'Pending'}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">{master.user_email}</p>
                      </div>
                      <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Building2 className="h-3 w-3" />
                          <span>{master.company_name}</span>
                        </span>
                        {master.first_login_completed && (
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Setup Complete</span>
                          </span>
                        )}
                        {master.last_login_at && (
                          <span>Last login: {new Date(master.last_login_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleResetPassword(master)}
                      disabled={resetPasswordMutation.isPending}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                      title="Reset Password"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataTableShell>
    </>
  )
}

export default AthensMastersPage