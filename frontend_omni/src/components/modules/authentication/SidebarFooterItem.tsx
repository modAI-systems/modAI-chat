import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useSession } from "@/services/modules/session/ContextProvider";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { logout } from "./services/authService";

interface LogoutButtonProps {
    className?: string;
}

export function SidebarFooterItem({ className }: LogoutButtonProps) {
    const { clearSession, session } = useSession()

    const handleLogout = async () => {
        try {
            await logout()
            // Clear the session after successful logout
            clearSession()
        } catch (error) {
            console.error("Logout failed:", error)
            // Still clear session even if logout fails
            clearSession()
        }
    }

    return (
        <>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton asChild tooltip="Log in">
                    <Link to="/login">
                        <LogIn />
                        <span>Log in</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton asChild tooltip="Register">
                    <Link to="/register">
                        <UserPlus />
                        <span>Register</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={className} hidden={!session}>
                <SidebarMenuButton asChild onClick={handleLogout} tooltip="Log out">
                    <div className="cursor-pointer">
                        <LogOut />
                        <span>Log out</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </>
    );
}
