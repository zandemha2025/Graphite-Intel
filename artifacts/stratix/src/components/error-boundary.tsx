import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI. Receives the error and a reset callback. */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches React render errors and displays a fallback UI
 * instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

/** Full-page error fallback matching the app's dark theme. */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex h-screen w-full items-center justify-center"
      style={{ background: "#0D0C0B" }}
    >
      <div className="max-w-md w-full px-8 py-10 text-center">
        <div
          className="h-10 w-10 mx-auto mb-6 border flex items-center justify-center"
          style={{ borderColor: "rgba(232,228,220,0.20)" }}
        >
          <span className="text-lg" style={{ color: "#E8E4DC" }}>!</span>
        </div>

        <h2
          className="font-sans text-lg font-medium mb-2"
          style={{ color: "#E8E4DC" }}
        >
          Something went wrong
        </h2>

        <p
          className="text-xs leading-relaxed mb-6"
          style={{ color: "rgba(232,228,220,0.50)" }}
        >
          An unexpected error occurred. You can try again or navigate back to a
          previous page.
        </p>

        {process.env.NODE_ENV !== "production" && (
          <pre
            className="text-left text-[10px] leading-relaxed mb-6 p-3 overflow-auto max-h-32 border"
            style={{
              color: "rgba(232,228,220,0.40)",
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {error.message}
          </pre>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-xs font-medium border transition-colors hover:bg-white/5"
            style={{
              color: "#E8E4DC",
              borderColor: "rgba(232,228,220,0.20)",
              background: "transparent",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ color: "rgba(232,228,220,0.50)" }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact inline error fallback for individual page sections. */
export function SectionErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6"
      style={{ color: "rgba(232,228,220,0.50)" }}
    >
      <p className="text-xs font-medium mb-1 font-medium" style={{ color: "#E8E4DC" }}>
        Failed to load this section
      </p>
      <p className="text-[11px] mb-4" style={{ color: "rgba(232,228,220,0.40)" }}>
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="px-3 py-1.5 text-xs font-medium border transition-colors hover:bg-white/5"
        style={{
          color: "rgba(232,228,220,0.60)",
          borderColor: "rgba(232,228,220,0.15)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
