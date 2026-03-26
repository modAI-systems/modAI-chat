import { getModules } from "@/core/module-system/index.js";

export interface Tool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

/**
 * The module type registered in modules*.json for the tool service.
 * Used by consumers: getModules().getOne<ToolService>("ToolsManagementService")
 */
export const TOOL_SERVICE_TYPE = "ToolsManagementService";

/**
 * Public interface for the tool management service.
 * Implementations live in sibling files (e.g. default.svelte.ts).
 */
export interface ToolService {
    tools: Tool[];
    selectedToolNames: Set<string>;
    loading: boolean;
    error: string | null;
    readonly selectedTools: Tool[];
    fetchTools(): Promise<void>;
    toggleTool(name: string): void;
}

/**
 * Returns the active ToolService from the module system.
 * Must be called at component initialisation time (top-level script).
 */
export function getToolService(): ToolService {
    const service = getModules().getOne<ToolService>(TOOL_SERVICE_TYPE);
    if (!service) {
        throw new Error("ToolService module not registered");
    }
    return service;
}
