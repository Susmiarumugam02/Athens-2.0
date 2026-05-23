import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[QR ErrorBoundary] QR attendance UI failed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          type="error"
          showIcon
          message="QR attendance could not load"
          description="Close this panel and try again. The rest of the training page is still available."
          action={
            <Button size="small" onClick={() => this.setState({ error: null })}>
              Retry
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
