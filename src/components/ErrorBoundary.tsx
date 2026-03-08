import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches rendering errors in child components
 * and displays a recovery UI instead of crashing the entire app.
 * 
 * Used in SimLayout to wrap each simulation module, ensuring
 * that a crash in one module doesn't bring down the whole platform.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RoboSimLab] Simulation error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center h-full min-h-[300px] p-8">
          <div className="sim-panel p-6 max-w-md text-center space-y-4">
            <div className="text-2xl">⚠️</div>
            <h3 className="text-sm font-semibold text-foreground">Simulation Error</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred in this simulation module."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs font-mono py-2 px-4 rounded border border-primary text-primary hover:bg-primary/10 transition-colors"
            >
              ↺ Restart Module
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
