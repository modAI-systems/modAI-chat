export type OpenAIFunctionTool = {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
        strict?: boolean;
    };
};

/**
 * Public interface for tool discovery and selection persistence.
 */
export interface ToolsService {
    /** Returns all tools currently available from the backend. */
    fetchAvailableTools(): Promise<OpenAIFunctionTool[]>;
    /** Returns the currently selected tool names. */
    fetchSelectedToolNames(): Promise<string[]>;
    /** Persists the selected tool names. */
    saveSelectedToolNames(toolNames: string[]): Promise<void>;
}
