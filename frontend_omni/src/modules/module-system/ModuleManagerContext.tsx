import { useMemo, type ReactNode } from "react";
import {
    ModuleRegistry,
    useModuleManagerFromManifest,
} from "./manifestModuleManager";
import { useManifest } from "./moduleManifestLoader";
import { ModuleManagerContext } from ".";

const manifestPath = "/modules/manifest.json";

interface ModuleManagerProviderProps {
    children: ReactNode;
}

export function ModuleManagerProvider({
    children,
}: ModuleManagerProviderProps) {
    const manifest = useManifest(manifestPath);
    const moduleManager = useModuleManagerFromManifest(manifest);

    const registry = useMemo(
        () => new ModuleRegistry(moduleManager.getActiveModules()),
        [moduleManager],
    );

    return (
        <ModuleManagerContext value={registry}>{children}</ModuleManagerContext>
    );
}
