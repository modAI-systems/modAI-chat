import type { ReactNode, ComponentType } from "react";
import {
    ModuleManagerContext,
    useModules,
} from "@/moduleif/moduleSystemService";
import { useModuleManagerFromManifest } from "./manifestModuleManager";
import { useManifest } from "./moduleManifestLoader";

const manifestPath = "/modules/manifest.json";

interface ModuleManagerProviderProps {
    children: ReactNode;
}

export function ModuleManagerProvider({
    children,
}: ModuleManagerProviderProps) {
    const manifest = useManifest(manifestPath);
    const moduleManager = useModuleManagerFromManifest(manifest);

    return (
        <ModuleManagerContext value={moduleManager}>
            {children}
        </ModuleManagerContext>
    );
}

export function ModuleContextProviders({
    children,
    name,
}: {
    children: React.ReactNode;
    name: string;
}) {
    const modules = useModules();
    const contextProviders =
        modules.getAll<ComponentType<{ children: ReactNode }>>(name);

    // Wrap children with all context provider modules
    return contextProviders.reduce(
        (wrappedChildren, Component) => (
            <Component>{wrappedChildren}</Component>
        ),
        children
    );
}
