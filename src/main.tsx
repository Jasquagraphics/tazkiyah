import {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleClearSession = () => {
    localStorage.removeItem('user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030014] text-white p-8">
          <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h2 className="text-xl font-black text-red-400 mb-4 uppercase tracking-widest">Application Error</h2>
            <p className="text-white/60 mb-6 text-sm">Something went wrong while loading the application.</p>
            <pre className="bg-black/50 p-4 rounded-lg text-xs text-red-300 overflow-x-auto mb-6 font-mono">
              {this.state.error?.message}
            </pre>
            <button
              onClick={this.handleClearSession}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl font-bold transition-all uppercase tracking-widest text-xs"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
