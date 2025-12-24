import { LLMPicker } from "./LLMPicker";

export function ChatTopPane() {
    return (
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <LLMPicker />
        </div>
    );
}
