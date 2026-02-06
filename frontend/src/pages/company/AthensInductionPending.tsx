import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { athensSustCompanyApi } from '../../services/athensSustCompanyApi'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const AthensInductionPending: React.FC = () => {
  const completeMutation = useMutation({
    mutationFn: () => athensSustCompanyApi.completeInduction(),
    onSuccess: () => {
      toast.success('Induction marked as complete')
      window.location.href = '/company'
    },
    onError: () => toast.error('Failed to complete induction')
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Induction Required</h1>
        <p className="text-sm text-gray-600 mt-2">
          Complete induction training to unlock full access.
        </p>
        <Button onClick={() => completeMutation.mutate()} className="mt-6" disabled={completeMutation.isPending}>
          {completeMutation.isPending ? 'Processing...' : 'Mark Induction Complete'}
        </Button>
      </div>
    </div>
  )
}

export default AthensInductionPending
