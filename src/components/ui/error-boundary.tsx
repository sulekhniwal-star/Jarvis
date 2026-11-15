"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./button";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-danger/30 bg-surface-1 shadow-lg max-w-lg mx-auto my-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 border border-danger/30 text-danger mb-4">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            System Component Exception
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md">
            {this.state.error?.message ??
              "An unexpected error occurred while rendering this module."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Retry Component</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
