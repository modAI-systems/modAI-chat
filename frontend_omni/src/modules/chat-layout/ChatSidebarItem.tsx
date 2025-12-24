import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import {
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shadcn/components/ui/sidebar";

export function ChatSidebarItem() {
    const { t } = useTranslation("chat-layout");
    const location = useLocation();

    const handleClick = () => {
        if (location.pathname === "/chat") {
            window.dispatchEvent(new CustomEvent("clear-chat"));
        }
    };

    return (
        <SidebarMenuItem>
            {location.pathname === "/chat" ? (
                <SidebarMenuButton onClick={handleClick}>
                    <MessageSquare />
                    <span>{t("chat", { defaultValue: "Chat" })}</span>
                </SidebarMenuButton>
            ) : (
                <SidebarMenuButton asChild>
                    <Link to="/chat">
                        <MessageSquare />
                        <span>{t("chat", { defaultValue: "Chat" })}</span>
                    </Link>
                </SidebarMenuButton>
            )}
        </SidebarMenuItem>
    );
}
