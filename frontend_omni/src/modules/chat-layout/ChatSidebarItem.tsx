import {
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shadcn/components/ui/sidebar";
import { MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ChatSidebarItem() {
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
