import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Clock, User, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface AthensApprovalsProps {
  onNavigateToTab?: (tab: string) => void
}

const AthensApprovals: React.FC<AthensApprovalsProps> = () => {
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()
  const queryClient = useQueryClient()

  const { data: adminDetailsData, isLoading: adminDetailsLoading } = useQuery({
    queryKey: ['athens-sust-admin-details-approvals'],
    queryFn: () => apiClient.get('/api/athens-sust/approvals/admin-details/'),
    enabled: isEnabled,
    refetchInterval: 30000
  })

  const { data: userDetailsData, isLoading: userDetailsLoading } = useQuery({
    queryKey: ['athens-sust-user-details-approvals'],
    queryFn: () => apiClient.get('/api/athens-sust/approvals/user-details/'),
    enabled: isEnabled,
    refetchInterval: 30000
  })

  const approveAdminDetailsMutation = useMutation({
    mutationFn: (userId: number) => 
      apiClient.post(`/api/athens-sust/approvals/admin-details/${userId}/approve/`),
    onSuccess: () => {
      toast.success('Admin details approved successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-sust-admin-details-approvals'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve admin details')
    }
  })

  const approveUserDetailsMutation = useMutation({
    mutationFn: (pk: number) => 
      apiClient.post(`/api/athens-sust/approvals/user-details/${pk}/approve/`),
    onSuccess: () => {
      toast.success('User details approved successfully!')
      queryClient.invalidateQueries({ queryKey: ['athens-sust-user-details-approvals'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve user details')
    }
  })

  const handleApproveAdminDetails = (userId: number) => {
    approveAdminDetailsMutation.mutate(userId)
  }

  const handleApproveUserDetails = (pk: number) => {
    approveUserDetailsMutation.mutate(pk)
  }

  if (serviceLoading || adminDetailsLoading || userDetailsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading pending approvals..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">
                Athens Sustainability Service Not Available
              </h3>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Your company does not have access to Athens Sustainability service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const adminDetails = adminDetailsData?.data?.results || []
  const userDetails = userDetailsData?.data?.results || []
  const totalPending = adminDetails.length + userDetails.length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Pending Approvals
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve pending admin and user details
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalPending} pending approval{totalPending !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {totalPending === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Pending Approvals
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              All admin and user details have been reviewed and approved
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Admin Details Approvals */}
          {adminDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Pending Admin Details ({adminDetails.length})</span>
                </CardTitle>
                <CardDescription>
                  Admin details waiting for approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminDetails.map((admin: any) => (
                    <div key={admin.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {admin.user_name || admin.username || `User ${admin.user_id}`}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {admin.email || 'No email provided'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Submitted: {admin.created_at ? new Date(admin.created_at).toLocaleString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveAdminDetails(admin.user_id || admin.id)}
                            disabled={approveAdminDetailsMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approveAdminDetailsMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Details Approvals */}
          {userDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Pending User Details ({userDetails.length})</span>
                </CardTitle>
                <CardDescription>
                  User details waiting for approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userDetails.map((user: any) => (
                    <div key={user.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {user.user_name || user.username || `User ${user.user_id}`}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email || 'No email provided'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Submitted: {user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveUserDetails(user.id)}
                            disabled={approveUserDetailsMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approveUserDetailsMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AthensApprovals