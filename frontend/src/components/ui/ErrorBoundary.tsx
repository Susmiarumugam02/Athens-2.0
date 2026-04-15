import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Card, Typography, Space, Alert } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with error tracking services like Sentry here
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{ padding: '20px', minHeight: '400px' }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="An unexpected error occurred while rendering this component."
            extra={[
              <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={this.handleRetry}>
                Try Again
              </Button>,
              <Button key="home" icon={<HomeOutlined />} onClick={this.handleGoHome}>
                Go to Dashboard
              </Button>,
              <Button key="reload" icon={<ReloadOutlined />} onClick={this.handleReload}>
                Reload Page
              </Button>
            ]}
          >
            <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
              <Alert
                message="Error Details"
                description={
                  <div>
                    <Paragraph>
                      <Text strong>Error:</Text> {this.state.error?.message || 'Unknown error'}
                    </Paragraph>
                    {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                      <details style={{ marginTop: '10px' }}>
                        <summary style={{ cursor: 'pointer', color: '#1890ff' }}>
                          View Stack Trace (Development)
                        </summary>
                        <pre style={{ 
                          fontSize: '12px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '10px', 
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '200px',
                          marginTop: '10px'
                        }}>
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                }
                type="error"
                showIcon
                style={{ marginTop: '20px' }}
              />
            </div>
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Lightweight error boundary for dashboard cards
export const DashboardCardErrorBoundary: React.FC<{ children: ReactNode; title?: string }> = ({ 
  children, 
  title = 'Dashboard Card' 
}) => (
  <ErrorBoundary
    fallback={
      <Card>
        <Result
          status="warning"
          title="Failed to Load"
          subTitle={`${title} encountered an error`}
          extra={
            <Button size="small" onClick={() => window.location.reload()}>
              Reload
            </Button>
          }
        />
      </Card>
    }
  >
    {children}
  </ErrorBoundary>
);

// Table error boundary
export const TableErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <Alert
        message="Table Error"
        description="Failed to render table data. Please refresh the page."
        type="error"
        showIcon
        action={
          <Space>
            <Button size="small" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </Space>
        }
      />
    }
  >
    {children}
  </ErrorBoundary>
);

// Chart error boundary
export const ChartErrorBoundary: React.FC<{ children: ReactNode; height?: number }> = ({ 
  children, 
  height = 200 
}) => (
  <ErrorBoundary
    fallback={
      <div 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: '6px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }} />
          <div style={{ color: '#666' }}>Chart failed to load</div>
          <Button size="small" type="link" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;