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
    /**
     * Returns all tools currently available from the backend.
     *
     * @throws {Error} If the network request fails or the response body cannot be parsed as JSON.
     *   Callers are responsible for handling these errors (e.g. in a try/catch or via an effect error boundary).
     */
    fetchAvailableTools(): Promise<OpenAIFunctionTool[]>;
}
