import { type ComponentType, useEffect, useState } from "react";
import type { PromptInputMessage } from "@/modules/chat-layout/shadcn/components/ai-elements/prompt-input";
import type { Message, MessagePart } from "@/modules/chat-service";
import { MessagePartType, MessageRole } from "@/modules/chat-service";
import { useOpenAI } from "@/modules/chat-service/useOpenAI";
import { useLLMPicker } from "@/modules/llm-picker";
import { useModules } from "@/modules/module-system";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";

const createAssistantMessage = (parts: MessagePart[]) => {
    const finalContent = parts
        .filter((part) => part.type === MessagePartType.TEXT)
        .map((part) => part.text || "")
        .join("");
    return {
        id: `assistant-${Date.now()}`,
        role: MessageRole.ASSISTANT,
        content: finalContent,
    };
};

export default function ChatArea() {
    const modules = useModules();
    const ChatTopPane = modules.getOne<ComponentType>("ChatTopPane");

    const { selectedModel } = useLLMPicker();

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<"ready" | "streaming" | "error">(
        "ready",
    );
    const [inputMessage, setInputMessage] = useState<MessagePart[] | null>(
        null,
    );

    useEffect(() => {
        const handleClearChat = () => {
            setMessages([]);
            setInput("");
            setInputMessage(null);
            setStatus("ready");
        };

        window.addEventListener("clear-chat", handleClearChat);

        return () => {
            window.removeEventListener("clear-chat", handleClearChat);
        };
    }, []);

    const chatService = useOpenAI(
        selectedModel?.[0]?.api_key || "",
        selectedModel?.[0]?.url || "",
    );

    const handleSubmit = async (message: PromptInputMessage) => {
        const hasAttachments = Boolean(message.files?.length);

        if (chatService == null || selectedModel == null) {
            return;
        }

        if (!message.text && !hasAttachments) {
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: MessageRole.USER,
            content: message.text || "",
        };

        const currentMessages = messages;
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage([]);
        setStatus("streaming");
        setInput("");

        try {
            const parts: MessagePart[] = [];
            for await (const chunk of chatService.sendMessage(
                message.text || "",
                { model: selectedModel[1].name },
                currentMessages,
            )) {
                if (chunk.type === MessagePartType.TEXT && chunk.text) {
                    parts.push(chunk);
                    setInputMessage([...parts]);
                }
            }
            // Create final message
            const assistantMessage = createAssistantMessage(parts);
            setMessages((prev) => [...prev, assistantMessage]);
            setInputMessage(null);
            setStatus("ready");
        } catch (error) {
            console.error("Error sending message:", error);
            setStatus("error");
            setInputMessage(null);
        }
    };

    const handleRegenerate = async (message: Message) => {
        const messageIndex = messages.findIndex((m) => m.id === message.id);

        if (chatService == null || selectedModel == null || messageIndex <= 0) {
            return;
        }

        const previousMessages = messages.slice(0, messageIndex);
        const userMessage = messages[messageIndex - 1];

        if (userMessage.role !== MessageRole.USER) {
            return;
        }

        // Remove messages after the specified message including the message itself
        setMessages(previousMessages);
        setStatus("streaming");
        setInputMessage([]);

        try {
            const parts: MessagePart[] = [];
            for await (const chunk of chatService.sendMessage(
                userMessage.content,
                { model: selectedModel[1].name },
                previousMessages,
            )) {
                if (chunk.type === MessagePartType.TEXT && chunk.text) {
                    parts.push(chunk);
                    setInputMessage([...parts]);
                }
            }
            // Create final message
            const assistantMessage = createAssistantMessage(parts);
            setMessages((prev) => [...prev, assistantMessage]);
            setInputMessage(null);
            setStatus("ready");
        } catch (error) {
            console.error("Error regenerating:", error);
            setStatus("error");
            setInputMessage(null);
        }
    };

    return (
        <div className="size-full flex flex-col">
            {ChatTopPane && <ChatTopPane />}
            <MessageList
                pastMessages={messages}
                inputMessage={inputMessage}
                onRegenerate={handleRegenerate}
            />
            <ChatInput
                className="max-w-5xl mx-auto pl-6 pr-6 pb-6"
                input={input}
                active={selectedModel != null}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                status={status}
            />
        </div>
    );
}
