import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { logout } from "@/components/modules/login/authService";
import { useNavigate } from "react-router-dom";

interface LogoutButtonProps {
    className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await logout()
            // Navigate to login page
            navigate("/login")
        } catch (error) {
            console.error("Logout failed:", error)
            // Still navigate to login page even if logout fails
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
