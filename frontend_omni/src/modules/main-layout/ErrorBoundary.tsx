import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { DefaultErrorPage } from "./ErrorPage";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Return custom fallback UI or default error page
            return (
                this.props.fallback || (
                    <DefaultErrorPage error={this.state.error} />
                )
            );
        }

        return this.props.children;
    }
}
