'use client';

import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error);
        console.error('Error info:', errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                            <div className="mb-6">
                                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-2">
                                    ⚠️ Error
                                </h1>
                                <p className="text-gray-600 text-lg">Something went wrong</p>
                            </div>

                            <div className="mb-8">
                                <p className="text-gray-700 mb-4">
                                    An unexpected error occurred. Please try refreshing the page.
                                </p>
                                {this.state.error && (
                                    <details className="text-left text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
                                        <summary className="cursor-pointer font-semibold">Error Details</summary>
                                        <pre className="mt-2 overflow-auto text-xs">
                                            {this.state.error.message}
                                        </pre>
                                    </details>
                                )}
                            </div>

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
