import { useEffect, useRef, useState } from 'react'
import { chatApi, type ChatMessage } from './chatApiService'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { useEventBus } from '@/hooks/useEventBus'
import type { ToggleSidebar } from './Events'
import type { SelectedModel } from '@/moduleif/llmPicker'
import type { ProviderTypeGroup } from '@/moduleif/llmProviderService'
import { llmProviderService } from '../llm-provider-service/LLMProviderService'
import { useModules } from '@/contexts/ModuleManagerContext'

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

interface ChatAreaProps {
    messages: MessageData[]
}

interface ChatInputProps {
    onSendMessage: (message: string) => void
    disabled?: boolean
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

function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
    const [message, setMessage] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (message.trim() && !disabled) {
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
                    disabled={!message.trim() || disabled}
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
                    placeholder={disabled ? "Please select a provider and model first..." : "Type your message..."}
                    className="w-full h-full bg-transparent resize-none focus:outline-none placeholder-muted-foreground"
                    disabled={disabled}
                />
            </div>
        </div>
    )
}

function ChatComponent() {
    const modules = useModules()
    const [messages, setMessages] = useState<MessageData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedModel, setSelectedModel] = useState<SelectedModel>({
        providerType: 'openai',
        providerId: '',
        modelId: ''
    })

    const modelPickers = modules.getComponentsByName("ModelPicker")
    const ModelPicker = modelPickers.length > 0 ? modelPickers[0] : null;

    // Provider data state
    const [providerTypes, setProviderTypes] = useState<ProviderTypeGroup[]>([])
    // Note: Loading and error states for providers could be used in UI for better UX
    // const [providersLoading, setProvidersLoading] = useState(true)
    // const [providersError, setProvidersError] = useState<string | null>(null)

    // Sidebar state management
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [activeSidebarId, setActiveSidebarId] = useState<string | null>(null)
    const [ActiveSidebarComponent, setActiveSidebarComponent] = useState<React.ComponentType<unknown> | null>(null)

    // Load providers on component mount
    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            // setProvidersLoading(true)
            // setProvidersError(null)
            const data = await llmProviderService.getAllProvidersWithModels()
            setProviderTypes(data)
        } catch (err) {
            console.error('Failed to load providers:', err)
            // setProvidersError('Failed to load providers. Please try again.')
        } finally {
            // setProvidersLoading(false)
        }
    }

    useEventBus<ToggleSidebar>('toggleSidebar', (notification) => {
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
        // Validate configuration before sending
        if (!selectedModel.providerType || !selectedModel.providerId || !selectedModel.modelId) {
            console.error('Invalid configuration: provider and model must be selected')
            return
        }

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
                selectedModel.providerType,
                selectedModel.modelId,
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
                        {ModelPicker && (
                            <ModelPicker
                                initialModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                providerTypes={providerTypes}
                            />
                        )}
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
                                    <ChatInput
                                        onSendMessage={handleSendMessage}
                                        disabled={!selectedModel.providerId || !selectedModel.modelId}
                                    />
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
