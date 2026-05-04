import React from 'react'
import { useAthensSustainabilityEnabled } from '../../../hooks/useAthensSustainabilityEnabled'
import { LoadingSpinner } from '../../ui/LoadingSpinner'
import { Card, CardContent } from '../../ui/Card'

interface AthensServiceGateProps {
  children: React.ReactNode
}

const AthensServiceGate: React.FC<AthensServiceGateProps> = ({ children }) => {
  const { isEnabled, isLoading, error } = useAthensSustainabilityEnabled()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Checking Athens Sustainability access..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-lg font-semibold text-gray-900">Athens Sustainability Service Not Available</p>
            <p className="text-sm text-gray-500 mt-2">{error || 'Your company does not have access to this service.'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

export default AthensServiceGate
