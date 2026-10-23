import React from 'react';
import { reportClientError } from '../lib/errorReporter';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time crashes anywhere below it and shows a friendly screen.
 *
 * Users never see a raw exception, a stack trace or an API message. The error
 * is reported to the backend (and from there to Discord) instead.
 */
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError({
      message: `React render error: ${error?.message || 'Unknown error'}`,
      stack: [error?.stack, info?.componentStack].filter(Boolean).join('\n'),
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      appVersion: process.env.REACT_APP_VERSION || 'unknown',
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg, #0D0F1A)',
          color: 'var(--text, #EDEEF5)',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '32px 28px',
            borderRadius: 'var(--radius-card, 14px)',
            border: '1px solid var(--border, #272C47)',
            background: 'var(--panel, #151829)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: '0 0 12px', fontSize: '22px' }}>
            Something went wrong
          </h1>
          <p
            style={{
              margin: '0 0 24px',
              color: 'var(--sub, #868CA8)',
              lineHeight: 1.5,
              fontSize: '15px',
            }}
          >
            We could not load this page. Please reload to try again. If the
            problem continues, contact support.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-input, 10px)',
              border: 'none',
              background: 'var(--profit, #38D9A9)',
              color: '#0D0F1A',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
