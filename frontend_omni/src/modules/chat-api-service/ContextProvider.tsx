import React from 'react';
import { ChatApiServiceContext } from "@/moduleif/chatApiService";
import { ChatApiService } from "./ChatApiService";

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const chatApiServiceInstance = new ChatApiService();

    return (
        <ChatApiServiceContext.Provider value={chatApiServiceInstance}>
            {children}
        </ChatApiServiceContext.Provider>
    );
}
