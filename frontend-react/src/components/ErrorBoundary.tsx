import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const debugEnabled =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('debug_api') === '1';
    if (debugEnabled) console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Result
            status="error"
            title="Что-то пошло не так"
            subTitle={this.state.error?.message || "Произошла ошибка при отображении этого компонента."}
            extra={[
              <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                Перезагрузить страницу
              </Button>
            ]}
          />
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '20px', textAlign: 'left', background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
              <Typography.Text type="secondary">
                <pre>{this.state.error?.stack}</pre>
              </Typography.Text>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
