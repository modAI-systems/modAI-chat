import { SidebarMenuButton, SidebarMenuItem } from "@/shadcn/components/ui/sidebar";
import { useSession } from "@/moduleif/sessionContext";
import { useAuthService } from "@/moduleif/authenticationService";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";

interface LogoutButtonProps {
    className?: string;
}

export function SidebarFooterItem({ className }: LogoutButtonProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { clearSession, session } = useSession()
    const authService = useAuthService()

    const handleLogout = async () => {
        try {
            await authService.logout()
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
