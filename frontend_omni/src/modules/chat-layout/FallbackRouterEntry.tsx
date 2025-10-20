import { Navigate, Route } from "react-router-dom";

export default function FallbackRouterEntry() {
    return <Route path="*" element={<Navigate to="/chat" replace />} />;
}
