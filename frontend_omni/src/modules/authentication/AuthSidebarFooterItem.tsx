import {
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shadcn/components/ui/sidebar";
import { useSession } from "@/modules/session-provider";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthService } from "@/modules/authentication-service";
import { useTranslation } from "react-i18next";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";

interface LogoutButtonProps {
    className?: string;
}

export default function AuthSidebarFooterItem({
    className,
}: LogoutButtonProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { clearSession, session } = useSession();
    const authService = useAuthService();
    const { t } = useTranslation("authentication");

    const handleLogout = async () => {
        try {
            await authService.logout();
            // Clear the session after successful logout
            clearSession();
            navigate(LOGIN_PATH);
        } catch (error) {
            console.error("Logout failed:", error);
            // Still clear session even if logout fails
            clearSession();
            navigate(LOGIN_PATH);
        }
    };

    return (
        <>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton
                    asChild
                    tooltip={t("login", { defaultValue: "Login" })}
                    isActive={location.pathname === LOGIN_PATH}
                >
                    <Link to={LOGIN_PATH}>
                        <LogIn />
                        <span>{t("login", { defaultValue: "Login" })}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={className} hidden={session !== null}>
                <SidebarMenuButton
                    asChild
                    tooltip={t("register", { defaultValue: "Register" })}
                    isActive={location.pathname === REGISTER_PATH}
                >
                    <Link to={REGISTER_PATH}>
                        <UserPlus />
                        <span>
                            {t("register", { defaultValue: "Register" })}
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={className} hidden={!session}>
                <SidebarMenuButton
                    asChild
                    onClick={handleLogout}
                    tooltip={t("logout", { defaultValue: "Logout" })}
                >
                    <div className="cursor-pointer">
                        <LogOut />
                        <span>{t("logout", { defaultValue: "Logout" })}</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </>
    );
}
