import { type ComponentType, createContext, useContext } from "react";
import type { ChatService } from "@/modules/chat-service";

// Create context for the chat service
export const ChatServiceContext = createContext<ChatService | undefined>(
    undefined,
);

export interface ChatSidePanelsState {
    LeftPanel: ComponentType | null;
    setLeftPanel: (content: ComponentType | null) => void;
    RightPanel: ComponentType | null;
    setRightPanel: (content: ComponentType | null) => void;
}

export const PanelsContext = createContext<ChatSidePanelsState | undefined>(
    undefined,
);

export function useChatSidePanels(): ChatSidePanelsState {
    const context = useContext(PanelsContext);
    if (!context) {
        throw new Error(
            "useChatSidePanels must be used within a PanelsProvider",
        );
    }
    return context;
}

/**
 * Hook to access the chat service from any component
 *
 * @returns ChatService instance
 * @throws Error if used outside of ChatServiceProvider
 */
export function useChatService(): ChatService {
    const context = useContext(ChatServiceContext);
    if (!context) {
        throw new Error(
            "useChatService must be used within a ChatServiceProvider",
        );
    }
    return context;
}
