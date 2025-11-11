// Module registry for static imports of all frontend modules
// This replaces the dynamic importModule function

import ChatArea from "@/modules/chat-layout/ChatArea";
import ChatRouterEntry from "@/modules/chat-layout/ChatRouterEntry";
import ChatSidebarItem from "@/modules/chat-layout/ChatSidebarItem";
import ChatSidePanelProvider from "@/modules/chat-layout/ChatSidePanelProvider";
import FallbackRouterEntry from "@/modules/chat-layout/FallbackRouterEntry";
import { OpenAIChatService } from "@/modules/chat-service/OpenAIService";
import ChatTopPane from "@/modules/llm-picker/ChatTopPane";
import LLMContextProvider from "@/modules/llm-picker/LLMContextProvider";
import GlobalSettingsNavItem from "@/modules/llm-provider-management/GlobalSettingsNavItem";
import GlobalSettingsRouterEntry from "@/modules/llm-provider-management/GlobalSettingsRouterEntry";
import LLMNoBackendProviderService from "@/modules/llm-provider-service/LLMNoBackendProviderService";
import RouterEntryGlobal from "@/modules/settings/RouterEntryGlobal";
import SidebarFooterItemGlobal from "@/modules/settings/SidebarFooterItemGlobal";
import NoBackendWelcomeMessage from "@/modules/welcome-message/NoBackendWelcomeMessage";
import AuthContextProvider from "@/modules/authentication-service/AuthContextProvider";
import AuthRouterEntry from "@/modules/authentication/AuthRouterEntry";
import AuthSidebarFooterItem from "@/modules/authentication/AuthSidebarFooterItem";
import SessionContextProvider from "@/modules/session-provider/SessionContextProvider";
import UserServiceContextProvider from "@/modules/user-service/UserServiceContextProvider";

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
    "@/modules/chat-service/OpenAIService": OpenAIChatService,
    "@/modules/authentication-service/AuthContextProvider": AuthContextProvider,
    "@/modules/authentication/AuthRouterEntry": AuthRouterEntry,
    "@/modules/authentication/AuthSidebarFooterItem": AuthSidebarFooterItem,
    "@/modules/session-provider/SessionContextProvider": SessionContextProvider,
    "@/modules/user-service/UserServiceContextProvider": UserServiceContextProvider,
};
