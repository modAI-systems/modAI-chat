import { SidebarMenuButton } from "@/shadcn/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function GlobalSettingsNavItem() {
    const location = useLocation();
    const { t } = useTranslation("llm-provider-management");

    return (
        <SidebarMenuButton
            asChild
            isActive={location.pathname === "/settings/global/llm-providers"}
        >
            <Link to="/settings/global/llm-providers">
                <Settings />
                <span>{t("nav-item", { defaultValue: "LLM Providers" })}</span>
            </Link>
        </SidebarMenuButton>
    );
}
