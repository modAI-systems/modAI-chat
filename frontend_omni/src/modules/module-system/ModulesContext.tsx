import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { ModulesContext } from ".";
import { activateModules } from "./moduleActivator";
import { LoadedModule, ModuleRegistry } from "./moduleRegistry";
import { fetchModulesJsonAsync } from "./modulesJson";

const modulesJsonPath = "/modules.json";

interface ModulesProviderProps {
    children: ReactNode;
}

export function ModulesProvider({ children }: ModulesProviderProps) {
    const { data: modulesJson, error } = useSuspenseQuery({
        queryKey: ["modulesJson", modulesJsonPath],
        queryFn: () => fetchModulesJsonAsync(modulesJsonPath),
    });

    if (error) {
        throw new Error(`Error loading module modules json: ${error.message}`);
    }

    if (!modulesJson) {
        throw new Error("Module json data is undefined");
    }

    const activeModules = useMemo(() => {
        const moduleRegistry = new ModuleRegistry(modulesJson.modules);
        const activeModules = activateModules(moduleRegistry);
        return new ActiveModules(activeModules);
    }, [modulesJson]);

    return <ModulesContext value={activeModules}>{children}</ModulesContext>;
}

class ActiveModules {
    private activeModules: Map<string, LoadedModule>;

    constructor(activeModules: LoadedModule[]) {
        this.activeModules = new Map(activeModules.map((m) => [m.id, m]));
    }

    /**
     * Get a single component of a specific name across all modules.
     * If more than one component with the same name exists, returns null.
     */
    getOne<T>(name: string): T | null {
        const elements = this.getAll<T>(name);

        if (elements.length > 1) {
            console.warn(
                `Multiple components found with name ${name}, returning null.`,
            );
            return null;
        }

        return elements.length === 1 ? elements[0] : null;
    }

    getAll<T>(name: string): T[] {
        const elements: T[] = [];
        for (const [, module] of this.activeModules) {
            if (module.type === name) {
                elements.push(module.component as T);
            }
        }
        return elements;
    }
}
