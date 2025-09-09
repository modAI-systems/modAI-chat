import { useEffect, useRef, useState } from 'react'
import { chatApi, type ChatMessage } from './chatApi'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '../../ui/button'
import { useEventBus } from '@/hooks/useEventBus'
import type { ToggleSidebar } from './Events'

export interface ChatConfig {
    provider: string
    model: string
}

interface ChatConfigProps {
    config: ChatConfig
    onConfigChange: (config: ChatConfig) => void
}

const PROVIDERS = [
    { value: 'open-ai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'ollama', label: 'Ollama' }
]

const MODELS_BY_PROVIDER: Record<string, string[]> = {
    'open-ai': ['gpt-4o-2024-08-06', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'ollama': ['llama2', 'mistral', 'codellama']
}
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

interface MessageProps {
    message: MessageData
}

function Message({ message }: MessageProps) {
    const isUser = message.sender === 'user'

    return (
        <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                    }`}>
                    {isUser ? 'U' : 'AI'}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-lg break-words ${isUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card border border-border rounded-bl-sm'
                        }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.usage && (
                            <span className="ml-2 text-xs opacity-70">
                                ({message.usage.input_tokens}→{message.usage.output_tokens} tokens)
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </div>
    )
}

function ChatConfig({ config, onConfigChange }: ChatConfigProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleProviderChange = (provider: string) => {
        const models = MODELS_BY_PROVIDER[provider] || []
        const model = models[0] || 'gpt-4o-2024-08-06'
        onConfigChange({ provider, model })
    }

    const handleModelChange = (model: string) => {
        onConfigChange({ ...config, model })
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md border border-border"
            >
                <span>⚙️</span>
                <span>{config.provider} / {config.model}</span>
                <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-md shadow-lg z-50">
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Provider</label>
                            <select
                                value={config.provider}
                                onChange={(e) => handleProviderChange(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                            >
                                {PROVIDERS.map(provider => (
                                    <option key={provider.value} value={provider.value}>
                                        {provider.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Model</label>
                            <select
                                value={config.model}
                                onChange={(e) => handleModelChange(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                            >
                                {(MODELS_BY_PROVIDER[config.provider] || []).map(model => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                        >
                            Apply Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

interface ChatAreaProps {
    messages: MessageData[]
}

interface ChatInputProps {
    onSendMessage: (message: string) => void
}

function ChatArea({ messages }: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    if (messages.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center text-2xl mb-4">
                        💬
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                    <p className="text-sm">Type a message below to begin chatting with the AI assistant.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}

function ChatInput({ onSendMessage }: ChatInputProps) {
    const [message, setMessage] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (message.trim()) {
            onSendMessage(message.trim())
            setMessage('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <div className="bg-background border-t border-border h-full flex flex-col">
            {/* Section 1: Tools and Meta */}
            <div className="p-2 flex items-center justify-between border-b border-border/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                        X
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Y
                    </div>
                    {/* Add more tools/buttons here as needed */}
                </div>
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                >
                    Send
                </Button>
            </div>

            {/* Section 2: Chat Text Input */}
            <div className="p-2 flex-1 min-h-0">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="w-full h-full bg-transparent resize-none focus:outline-none placeholder-muted-foreground"
                />
            </div>
        </div>
    )
}

function ChatComponent() {
    const [messages, setMessages] = useState<MessageData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState<ChatConfig>({
        provider: 'open-ai',
        model: 'gpt-4o-2024-08-06'
    })

    // Sidebar state management
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [activeSidebarId, setActiveSidebarId] = useState<string | null>(null)
    const [ActiveSidebarComponent, setActiveSidebarComponent] = useState<React.ComponentType<unknown> | null>(null)

    useEventBus<ToggleSidebar>('toggleSidebar', (notification) => {
        console.log(`Notification: ${notification.sidebarId}`)

        // If the sidebar is not open, open it with the provided component
        if (!sidebarOpen) {
            setSidebarOpen(true)
            setActiveSidebarId(notification.sidebarId)
            setActiveSidebarComponent(() => notification.sidebarComponent)
        }
        // If the sidebar is open and the provided id is the same as the opened id, close the sidebar
        else if (activeSidebarId === notification.sidebarId) {
            setSidebarOpen(false)
            setActiveSidebarId(null)
            setActiveSidebarComponent(null)
        }
        // If the sidebar is open and the provided id is different, switch to the provided component
        else {
            setActiveSidebarId(notification.sidebarId)
            setActiveSidebarComponent(() => notification.sidebarComponent)
        }
    })

    const generateId = () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }

    const handleSendMessage = async (messageContent: string) => {
        const userMessage: MessageData = {
            id: generateId(),
            content: messageContent,
            sender: 'user',
            timestamp: new Date()
        }

        // Add user message
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        // Create a placeholder bot message for streaming
        const botMessageId = generateId()
        const botMessage: MessageData = {
            id: botMessageId,
            content: '',
            sender: 'bot',
            timestamp: new Date()
        }

        // Add empty bot message that will be updated during streaming
        setMessages(prev => [...prev, botMessage])

        try {
            // Get all messages including the new user message for context
            const allMessages = [...messages, userMessage]

            // Convert MessageData to ChatMessage format for backend
            const chatMessages: ChatMessage[] = allMessages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))

            // Use streaming API
            await chatApi.sendMessageStream(
                chatMessages,
                config.provider,
                config.model,
                // On chunk received
                (chunk) => {
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMessageId
                            ? { ...msg, content: msg.content + chunk.content }
                            : msg
                    ))
                },
                // On error
                (error) => {
                    console.error('Streaming error:', error)
                    setMessages(prev => prev.map(msg =>
                        msg.id === botMessageId
                            ? { ...msg, content: `Error: ${error}` }
                            : msg
                    ))
                },
                // On complete
                () => {
                    setIsLoading(false)
                }
            )
        } catch (error) {
            console.error('Error sending message:', error)
            let errorMessage = "Sorry, I encountered an error. Please try again."

            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMessage = "Unable to connect to the backend server. Please check if the server is running."
                } else if (error.message.includes('HTTP error! status: 500')) {
                    errorMessage = "The backend server encountered an error. Please try again later."
                } else if (error.message.includes('HTTP error! status: 400')) {
                    errorMessage = "Invalid request format. Please check your input and try again."
                }
            }

            // Update the bot message with error content
            setMessages(prev => prev.map(msg =>
                msg.id === botMessageId
                    ? { ...msg, content: errorMessage }
                    : msg
            ))
            setIsLoading(false)
        }
    }

    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30} hidden={!sidebarOpen}>
                <div className="h-full bg-card border-r border-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Details</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSidebarOpen(false)
                                setActiveSidebarId(null)
                                setActiveSidebarComponent(null)
                            }}
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="h-full">
                        {ActiveSidebarComponent && <ActiveSidebarComponent />}
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle hidden={!sidebarOpen} />
            <ResizablePanel>
                <div className="flex flex-col h-full max-h-screen">
                    {/* Configuration Header */}
                    <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
                        <ChatConfig config={config} onConfigChange={setConfig} />
                    </div>

                    {/* Resizable layout for ChatArea and ChatInput */}
                    <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                        <ResizablePanel defaultSize={75} minSize={30}>
                            <div className="h-full">
                                <ChatArea messages={messages} />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        <ResizablePanel defaultSize={25} minSize={15} maxSize={70}>
                            <div className="h-full flex flex-col">
                                {/* Loading indicator */}
                                {isLoading && (
                                    <div className="px-4 py-2 text-center flex-shrink-0">
                                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                            <span className="text-sm">AI is typing...</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1">
                                    <ChatInput onSendMessage={handleSendMessage} />
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup >
    )
}

export default ChatComponent
