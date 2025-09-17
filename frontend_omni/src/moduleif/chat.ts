/**
 * Chat Module Interface
 *
 * Defines all types, contracts, and data structures for the chat functionality.
 * This interface enables multiple chat implementations while maintaining consistent contracts.
 */

// Import chat API types from the dedicated chat API service module
import type {
    ChatMessage,
    ChatResponse,
    StreamChunk,
    ChatApiService
} from "./chatApiService";

// ============================================================================
// Core Chat Data Structures
// ============================================================================

/**
 * Internal message data structure used by the chat UI component
 */
export interface MessageData {
    id: string
    content: string
    sender: 'user' | 'bot'
    timestamp: Date
    usage?: {
        input_tokens: number
        output_tokens: number
    }
}

// ============================================================================
// Chat Component Interfaces
// ============================================================================

/**
 * Props for message display component
 */
export interface MessageProps {
    message: MessageData
}

/**
 * Props for chat area component
 */
export interface ChatAreaProps {
    messages: MessageData[]
}

/**
 * Props for chat input component
 */
export interface ChatInputProps {
    onSendMessage: (message: string) => void
    disabled?: boolean
}

// ============================================================================
// Chat Events
// ============================================================================

/**
 * Event for toggling chat sidebar
 */
export interface ToggleSidebar {
    sidebarId: string
    sidebarComponent: React.ComponentType<unknown>
}

// ============================================================================
// Hook Declarations
// ============================================================================

/**
 * Hook for accessing chat functionality (if implemented)
 * This would be provided by a chat context provider
 */
export interface UseChatHook {
    messages: MessageData[]
    isLoading: boolean
    sendMessage: (content: string) => Promise<void>
    clearMessages: () => void
}

// Note: Actual hook implementation would be exported from the chat module's ContextProvider
// export declare function useChat(): UseChatHook;

// ============================================================================
// Chat Configuration
// ============================================================================

/**
 * Chat module configuration
 */
export interface ChatConfig {
    defaultProvider: string
    defaultModel: string
    maxMessages: number
    enableStreaming: boolean
}

// ============================================================================
// Re-export types from chat API service for convenience
// ============================================================================

export type { ChatMessage, ChatResponse, StreamChunk, ChatApiService };
