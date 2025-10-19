import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/modules/chat-layout/shadcn/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
} from "@/modules/chat-layout/shadcn/components/ai-elements/message";
import {
    Action,
    Actions,
} from "@/modules/chat-layout/shadcn/components/ai-elements/actions";
import { Response } from "@/modules/chat-layout/shadcn/components/ai-elements/response";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Loader } from "@/modules/chat-layout/shadcn/components/ai-elements/loader";
import type { Message as ChatMessage, MessagePart } from "../chat-service";
import { MessageRole } from "../chat-service";
import { useModules } from "@/modules/module-system";
import type { ComponentType } from "react";

interface MessageListProps {
    pastMessages: ChatMessage[];
    inputMessage: MessagePart[] | null;
    onRegenerate: (message: ChatMessage) => void;
    className?: string;
}

export default function MessageList({
    pastMessages,
    inputMessage,
    onRegenerate,
}: MessageListProps) {
    const modules = useModules();
    const WelcomeComponent = modules.getOne<ComponentType>(
        "ChatWelcomeMessagePane",
    );

    const hasMessages = pastMessages.length > 0 || inputMessage !== null;

    return (
        <>
            {!hasMessages && WelcomeComponent && <WelcomeComponent />}
            <Conversation className="p-6">
                <ConversationContent className="mx-auto max-w-5xl">
                    {pastMessages.map((message) => (
                        <CompletedMessage
                            key={message.id}
                            message={message}
                            onRegenerate={onRegenerate}
                        />
                    ))}
                    {inputMessage && <StreamingMessage parts={inputMessage} />}
                    <MessageLoaderIndicator inputMessage={inputMessage} />
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>
        </>
    );
}

function StreamingMessage({ parts }: { parts: MessagePart[] }) {
    const content = parts
        .filter((part) => part.type === "text")
        .map((part) => part.text || "")
        .join("");
    return (
        <>
            <Message from={MessageRole.ASSISTANT}>
                <MessageContent>
                    <Response>{content}</Response>
                </MessageContent>
            </Message>
        </>
    );
}

function CompletedMessage({
    message,
    onRegenerate,
}: {
    message: ChatMessage;
    onRegenerate: (message: ChatMessage) => void;
}) {
    return (
        <div key={message.id}>
            <TextMessage message={message} onRegenerate={onRegenerate} />
        </div>
    );
}

function TextMessage({
    message,
    onRegenerate,
}: {
    message: ChatMessage;
    onRegenerate: (message: ChatMessage) => void;
}) {
    return (
        <>
            <Message from={message.role}>
                <MessageContent>
                    <Response>{message.content}</Response>
                </MessageContent>
            </Message>
            <MessageActions message={message} onRegenerate={onRegenerate} />
        </>
    );
}

function MessageLoaderIndicator({
    inputMessage,
}: {
    inputMessage: MessagePart[] | null;
}) {
    if (inputMessage === null) {
        return null;
    }
    return <Loader />;
}

function MessageActions({
    message,
    onRegenerate,
}: {
    message: ChatMessage;
    onRegenerate: (message: ChatMessage) => void;
}) {
    if (message.role !== MessageRole.ASSISTANT) {
        return null;
    }

    return (
        <Actions>
            <Action onClick={() => onRegenerate(message)} label="Retry">
                <RefreshCcwIcon className="size-3" />
            </Action>
            <Action
                onClick={() =>
                    navigator.clipboard.writeText(message.content || "")
                }
                label="Copy"
            >
                <CopyIcon className="size-3" />
            </Action>
        </Actions>
    );
}
