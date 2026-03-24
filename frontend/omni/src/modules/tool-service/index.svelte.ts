const LOCAL_STORAGE_KEY = "selected_tools";

export interface OpenAIToolFunction {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
}

export interface OpenAITool {
    type: "function";
    function: OpenAIToolFunction;
}

class ToolService {
    tools = $state<OpenAITool[]>([]);
    selectedToolNames = $state<Set<string>>(new Set());
    loading = $state(false);
    error = $state<string | null>(null);

    constructor() {
        this.#loadSelectionFromStorage();
    }

    get selectedTools(): OpenAITool[] {
        return this.tools.filter((t) =>
            this.selectedToolNames.has(t.function.name),
        );
    }

    async fetchTools(): Promise<void> {
        this.loading = true;
        this.error = null;
        try {
            const response = await fetch("/api/tools");
            if (!response.ok) {
                throw new Error(`Failed to fetch tools: ${response.status}`);
            }
            const data = (await response.json()) as { tools: OpenAITool[] };
            this.tools = data.tools;
            // Remove selections for tools that no longer exist
            const availableNames = new Set(
                data.tools.map((t) => t.function.name),
            );
            const pruned = new Set(
                [...this.selectedToolNames].filter((name) =>
                    availableNames.has(name),
                ),
            );
            if (pruned.size !== this.selectedToolNames.size) {
                this.selectedToolNames = pruned;
                this.#saveSelectionToStorage();
            }
        } catch (e) {
            this.error =
                e instanceof Error ? e.message : "Failed to fetch tools";
            this.tools = [];
        } finally {
            this.loading = false;
        }
    }

    toggleTool(name: string): void {
        const next = new Set(this.selectedToolNames);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        this.selectedToolNames = next;
        this.#saveSelectionToStorage();
    }

    #loadSelectionFromStorage(): void {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                this.selectedToolNames = new Set(
                    JSON.parse(stored) as string[],
                );
            }
        } catch {
            this.selectedToolNames = new Set();
        }
    }

    #saveSelectionToStorage(): void {
        try {
            localStorage.setItem(
                LOCAL_STORAGE_KEY,
                JSON.stringify([...this.selectedToolNames]),
            );
        } catch (e) {
            console.error("Failed to save tool selection to localStorage:", e);
        }
    }
}

export const toolService = new ToolService();
