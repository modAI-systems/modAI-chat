import { Route } from "react-router-dom";
import { Navigate } from "react-router-dom";

export default function FallbackRouterEntry() {
    return <Route path="*" element={<Navigate to="/chat" replace />} />;
}
