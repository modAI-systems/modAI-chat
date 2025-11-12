import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { ModuleManagerContext } from ".";
import { ModuleManager, ModuleRegistry } from "./moduleManager";
import { fetchModulesJsonAsync } from "./modulesJson";

const modulesJsonPath = "/modules.json";

interface ModuleManagerProviderProps {
    children: ReactNode;
}

export function ModuleManagerProvider({
    children,
}: ModuleManagerProviderProps) {
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

    const registry = useMemo(() => {
        const moduleManager = new ModuleManager(modulesJson);
        return new ModuleRegistry(moduleManager.getActiveModules());
    }, [modulesJson]);

    return (
        <ModuleManagerContext value={registry}>{children}</ModuleManagerContext>
    );
}
