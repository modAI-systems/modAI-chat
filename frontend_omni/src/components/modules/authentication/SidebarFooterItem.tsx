import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useSession } from "@/services/modules/session/ContextProvider";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "./services/authService";

interface LogoutButtonProps {
    className?: string;
}

export function SidebarFooterItem({ className }: LogoutButtonProps) {
    const navigate = useNavigate()
    const { clearSession } = useSession()

    const handleLogout = async () => {
        try {
            await logout()
            // Clear the session after successful logout
            clearSession()
            // Navigate to login page
            navigate("/login")
        } catch (error) {
            console.error("Logout failed:", error)
            // Still clear session and navigate to login page even if logout fails
            clearSession()
            navigate("/login")
        }
    }

    return (
        <SidebarMenuItem className={className}>
            <SidebarMenuButton asChild onClick={handleLogout} tooltip="Log out">
                <div className="cursor-pointer">
                    <LogOut />
                    <span>Log out</span>
                </div>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
