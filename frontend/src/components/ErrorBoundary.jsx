import React from "react";
import { resetAllDemoData } from "../lib/store.js";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application boundary error:", error, errorInfo);
  }

  handleReset = () => {
    resetAllDemoData();
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#F7F9FC] text-[#1D2939] flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-[#D0D5DD] bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3F2] text-[#D92D20]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#101828]">System Recovery Console</h1>
            <p className="mt-2 text-sm text-[#475467]">
              An unexpected error interrupted the portal renderer. This synthetic demo sandbox allows you to reset local state to clean fixture data or reload.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded-lg bg-[#F8F9FA] p-3 text-xs font-mono text-[#D92D20] border border-[#EAECF0] overflow-x-auto max-h-32">
                {String(this.state.error.message || this.state.error)}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 rounded-lg bg-[#0B3A67] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#082949] transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#F9FAFB] transition-colors"
              >
                Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
