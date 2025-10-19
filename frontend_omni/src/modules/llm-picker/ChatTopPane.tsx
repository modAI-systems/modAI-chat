import { LLMPicker } from "./LLMPicker";

export default function ChatTopPane() {
    return (
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <LLMPicker />
        </div>
    );
}
