import React, { createContext, useContext } from 'react';
import type {
    ChatApiService as ChatApiServiceInterface,
    UseChatApiServiceHook
} from "@/moduleif/chatApiService";
import { ChatApiService } from "./ChatApiService";

const ChatApiServiceContext = createContext<ChatApiServiceInterface | undefined>(undefined);

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const chatApiServiceInstance = new ChatApiService();

    return (
        <ChatApiServiceContext.Provider value={chatApiServiceInstance}>
            {children}
        </ChatApiServiceContext.Provider>
    );
}

export function useChatApiService(): UseChatApiServiceHook {
    const context = useContext(ChatApiServiceContext);

    return {
        chatApiService: context || new ChatApiService(), // Fallback to direct instance
        isAvailable: context !== undefined
    };
}
