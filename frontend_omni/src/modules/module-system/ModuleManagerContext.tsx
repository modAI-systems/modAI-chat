import { useState, type ReactNode } from "react";
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

    const [registry, setRegistry] = useState(
        () => new ModuleRegistry(moduleManager.getActiveModules())
    );

    return (
        <ModuleManagerContext
            value={{
                getOne: registry.getOne.bind(registry),
                getAll: registry.getAll.bind(registry),
                deactivate: (id: string) => {
                    moduleManager.deactivate(id);
                    setRegistry(
                        new ModuleRegistry(moduleManager.getActiveModules())
                    );
                },
                activate: (id: string) => {
                    moduleManager.activate(id);
                    setRegistry(
                        new ModuleRegistry(moduleManager.getActiveModules())
                    );
                },
            }}
        >
            {children}
        </ModuleManagerContext>
    );
}
