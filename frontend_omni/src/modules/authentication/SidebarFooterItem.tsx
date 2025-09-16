import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useSession } from "@/modules/session/ContextProvider";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { logout } from "./services/authService";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";

interface LogoutButtonProps {
    className?: string;
}

export function SidebarFooterItem({ className }: LogoutButtonProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { clearSession, session } = useSession()

    const handleLogout = async () => {
        try {
            await logout()
            // Clear the session after successful logout
            clearSession()
            navigate(LOGIN_PATH)
        } catch (error) {
            console.error("Logout failed:", error)
            // Still clear session even if logout fails
            clearSession()
            navigate(LOGIN_PATH)
        }
    }

    return (
        <>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton asChild tooltip="Log in" isActive={location.pathname === LOGIN_PATH}>
                    <Link to={LOGIN_PATH}>
                        <LogIn />
                        <span>Log in</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton asChild tooltip="Register" isActive={location.pathname === REGISTER_PATH}>
                    <Link to={REGISTER_PATH}>
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
