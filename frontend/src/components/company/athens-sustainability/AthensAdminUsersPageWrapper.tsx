import React from 'react'
import AthensAdminUsersPageMinimal from './AthensAdminUsersPageMinimal'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class AthensAdminUsersErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Athens Employees Error</h2>
          <p className="text-red-700 mb-4">Something went wrong loading the Athens Employees page.</p>
          <details className="text-sm text-red-600">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {this.state.error?.message}
              {'\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )
    }

    return <AthensAdminUsersPageMinimal />
  }
}

export default AthensAdminUsersErrorBoundary
