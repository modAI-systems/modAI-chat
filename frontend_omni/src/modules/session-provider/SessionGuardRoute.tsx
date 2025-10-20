import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from ".";

interface SessionGuardRouteProps {
    children: React.ReactNode;
    requireSession?: boolean;
}

/**
 * SessionGuardRoute component that checks session availability based on requireSession prop.
 * If requireSession is true (default): guards routes that require a session to be available.
 * If requireSession is false: guards routes that should only be accessible when no session exists.
 * When guard condition fails, navigates to the current URL without the last path segment.
 * Otherwise, renders the children.
 */
export default function SessionGuardRoute({
    children,
    requireSession = true,
}: SessionGuardRouteProps): React.JSX.Element {
    const { session } = useSession();
    const location = useLocation();

    // Determine if we should redirect based on session state and requirement
    const shouldRedirect = requireSession ? !session : !!session;

    if (shouldRedirect) {
        // Get the current pathname and remove the last segment
        const pathSegments = location.pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
            pathSegments.pop(); // Remove the last segment
        }
        const newPath =
            pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "/";

        return <Navigate to={newPath} replace />;
    }

    return <>{children}</>;
}
