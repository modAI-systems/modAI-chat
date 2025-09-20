/**
 * Chat API Service Module Interface
 *
 * Defines all types, contracts, and data structures for chat API operations.
 * This module provides abstraction for different chat API implementations.
 */

import { createContext, useContext } from "react";

// ============================================================================
// Core Message Structures
// ============================================================================

/**
 * Represents a single chat message for API communication
 */
export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

/**
 * Request structure for chat API calls
 */
export interface ChatRequest {
    provider: string
    model: string
    input: ChatMessage[]
}

/**
 * Output structure from chat API response
 */
export interface ChatResponseOutput {
    text: string
    type: string
}

/**
 * Complete response structure from chat API
 */
export interface ChatResponse {
    output: ChatResponseOutput[]
    id: string
    model: string
    role: string
    usage: {
        input_tokens: number
        output_tokens: number
    }
}

/**
 * Structure for streaming response chunks
 */
export interface StreamChunk {
    content: string
    model: string
    type: string
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Service interface for chat API operations
 */
export interface ChatApiService {
    /**
     * Send a message and get a complete response
     */
    sendMessage(
        messages: ChatMessage[],
        provider?: string,
        model?: string
    ): Promise<ChatResponse>

    /**
     * Send a message with streaming response
     */
    sendMessageStream(
        messages: ChatMessage[],
        provider: string,
        model: string,
        onChunk: (chunk: StreamChunk) => void,
        onError: (error: string) => void,
        onComplete: () => void
    ): Promise<void>
}

// ============================================================================
// Hook Declaration
// ============================================================================

/**
 * Hook for accessing chat API service
 * Implementation provided by the chat-api-service module
 */
export interface UseChatApiServiceHook {
    chatApiService: ChatApiService
    isAvailable: boolean
}

// Create context for the chat API service
export const ChatApiServiceContext = createContext<ChatApiService | undefined>(undefined);

/**
 * Hook to access the chat API service from any component
 *
 * @returns ChatApiService instance
 * @throws Error if used outside of ChatApiServiceProvider
 */
export function useChatApiService(): ChatApiService {
    const context = useContext(ChatApiServiceContext);
    if (!context) {
        throw new Error('useChatApiService must be used within a ChatApiServiceProvider');
    }
    return context;
}
