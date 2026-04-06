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
 * Public interface for tool discovery.
 */
export interface ToolsService {
    /** Returns all tools currently available from the backend. */
    fetchAvailableTools(): Promise<OpenAIFunctionTool[]>;
}
