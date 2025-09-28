import type { ReactNode } from "react";
import { ModuleManagerContext } from "@/moduleif/moduleSystemService";
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
