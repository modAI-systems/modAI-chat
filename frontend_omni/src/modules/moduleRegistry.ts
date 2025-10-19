// Module registry for static imports of all frontend modules
// This replaces the dynamic importModule function

import ChatSidebarItem from "@/modules/chat-layout/ChatSidebarItem";
import ChatRouterEntry from "@/modules/chat-layout/ChatRouterEntry";
import FallbackRouterEntry from "@/modules/chat-layout/FallbackRouterEntry";
import ChatArea from "@/modules/chat-layout/ChatArea";
import LLMContextProvider from "@/modules/llm-picker/LLMContextProvider";
import ChatTopPane from "@/modules/llm-picker/ChatTopPane";
import LLMNoBackendProviderService from "@/modules/llm-provider-service/LLMNoBackendProviderService";
import ChatSidePanelProvider from "@/modules/chat-layout/ChatSidePanelProvider";
import SidebarFooterItemGlobal from "@/modules/settings/SidebarFooterItemGlobal";
import RouterEntryGlobal from "@/modules/settings/RouterEntryGlobal";
import GlobalSettingsRouterEntry from "@/modules/llm-provider-management/GlobalSettingsRouterEntry";
import GlobalSettingsNavItem from "@/modules/llm-provider-management/GlobalSettingsNavItem";
import NoBackendWelcomeMessage from "@/modules/welcome-message/NoBackendWelcomeMessage";

export const moduleRegistry: Record<string, unknown> = {
    "@/modules/chat-layout/ChatSidebarItem": ChatSidebarItem,
    "@/modules/chat-layout/ChatRouterEntry": ChatRouterEntry,
    "@/modules/chat-layout/FallbackRouterEntry": FallbackRouterEntry,
    "@/modules/chat-layout/ChatArea": ChatArea,
    "@/modules/llm-picker/LLMContextProvider": LLMContextProvider,
    "@/modules/llm-picker/ChatTopPane": ChatTopPane,
    "@/modules/llm-provider-service/LLMNoBackendProviderService":
        LLMNoBackendProviderService,
    "@/modules/chat-layout/ChatSidePanelProvider": ChatSidePanelProvider,
    "@/modules/settings/SidebarFooterItemGlobal": SidebarFooterItemGlobal,
    "@/modules/settings/RouterEntryGlobal": RouterEntryGlobal,
    "@/modules/llm-provider-management/GlobalSettingsRouterEntry":
        GlobalSettingsRouterEntry,
    "@/modules/llm-provider-management/GlobalSettingsNavItem":
        GlobalSettingsNavItem,
    "@/modules/welcome-message/NoBackendWelcomeMessage":
        NoBackendWelcomeMessage,
};
