import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { logout } from "./services/authService";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/services/module/session/SessionProvider";

interface LogoutButtonProps {
    className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
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
