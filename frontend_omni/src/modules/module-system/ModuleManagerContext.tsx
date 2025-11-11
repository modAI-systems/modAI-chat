import { type ReactNode, useMemo } from "react";
import { ModuleManagerContext } from ".";
import { useModulesJson } from "./moduleJsonLoader";
import { ModuleRegistry, useModuleManagerFromJson } from "./moduleManager";

const modulesJsonPath = "/modules.json";

interface ModuleManagerProviderProps {
    children: ReactNode;
}

export function ModuleManagerProvider({
    children,
}: ModuleManagerProviderProps) {
    const modulesJson = useModulesJson(modulesJsonPath);
    const moduleManager = useModuleManagerFromJson(modulesJson);

    const registry = useMemo(
        () => new ModuleRegistry(moduleManager.getActiveModules()),
        [moduleManager],
    );

    return (
        <ModuleManagerContext value={registry}>{children}</ModuleManagerContext>
    );
}
