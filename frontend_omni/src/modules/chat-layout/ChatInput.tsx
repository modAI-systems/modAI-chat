import {
    PromptInput,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputBody,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    type PromptInputMessage,
} from "@/modules/chat-layout/shadcn/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

interface ChatInputProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (message: PromptInputMessage) => void;
    status: ChatStatus;
    className?: string;
}

export default function ChatInput({
    input,
    onInputChange,
    onSubmit,
    status,
    className,
}: ChatInputProps) {
    const inputEmpty = input == null || input.trim().length === 0;

    return (
        <PromptInput
            onSubmit={onSubmit}
            className={className}
            globalDrop
            multiple
        >
            <PromptInputBody>
                <PromptInputAttachments>
                    {(attachment) => (
                        <PromptInputAttachment data={attachment} />
                    )}
                </PromptInputAttachments>
                <PromptInputTextarea
                    onChange={(e) => onInputChange(e.target.value)}
                    value={input}
                />
            </PromptInputBody>
            <PromptInputFooter>
                <PromptInputTools>
                    {/* <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                            <PromptInputActionAddAttachments />
                        </PromptInputActionMenuContent>
                    </PromptInputActionMenu> */}
                    {/* <PromptInputButton
                        variant={webSearch ? "default" : "ghost"}
                        onClick={onWebSearchToggle}
                    >
                        <GlobeIcon size={16} />
                        <span>Search</span>
                    </PromptInputButton> */}
                </PromptInputTools>
                <PromptInputSubmit
                    disabled={inputEmpty && status == "ready"}
                    status={status}
                />
            </PromptInputFooter>
        </PromptInput>
    );
}
