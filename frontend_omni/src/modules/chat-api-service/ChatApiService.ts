import type {
    ChatApiService as ChatApiServiceInterface,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    StreamChunk
} from "@/moduleif/chatApiService";

/**
 * HTTP-based implementation of the ChatApiService interface
 */
export class ChatApiService implements ChatApiServiceInterface {
    async sendMessage(
        messages: ChatMessage[],
        provider: string = 'open-ai',
        model: string = 'gpt-4o-2024-08-06'
    ): Promise<ChatResponse> {
        const request: ChatRequest = {
            provider,
            model,
            input: messages
        }

        const response = await fetch(`/api/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    }

    async sendMessageStream(
        messages: ChatMessage[],
        provider: string,
        model: string,
        onChunk: (chunk: StreamChunk) => void,
        onError: (error: string) => void,
        onComplete: () => void
    ): Promise<void> {
        const request: ChatRequest = {
            provider,
            model,
            input: messages
        }

        try {
            const response = await fetch(`/api/v1/chat?stream=true`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('No response body available')
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep the last incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6) // Remove 'data: ' prefix

                        if (data === '[DONE]') {
                            onComplete()
                            return
                        }

                        try {
                            const chunk = JSON.parse(data) as StreamChunk | { error: string }
                            if ('error' in chunk) {
                                onError(chunk.error)
                                return
                            }
                            onChunk(chunk)
                        } catch {
                            console.warn('Failed to parse chunk:', data)
                        }
                    }
                }
            }

            onComplete()
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Unknown error occurred')
        }
    }
}
