import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export default class ErrorBoundary extends Component<Props> {
  static displayName = 'ErrorBoundary';

  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-[#08090b] text-[#d1d5db] font-sans">
          <div className="text-center space-y-4 p-8">
            <div className="text-4xl">⚠</div>
            <h1 className="text-lg font-bold text-red-400">Terjadi Kesalahan</h1>
            <p className="text-sm text-slate-400 font-mono max-w-md">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-600 text-cyan-400 rounded text-xs font-mono font-bold hover:bg-cyan-600 hover:text-white transition-colors"
            >
              RELOAD APP
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}