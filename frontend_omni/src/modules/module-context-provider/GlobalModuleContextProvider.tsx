import { GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME } from "@/moduleif/moduleContextProvider";
import { useModules } from "@/moduleif/moduleSystemService";
import type { ComponentType, ReactNode } from "react";

export function ModuleContextProvider({
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

export function GlobalModuleContextProvider({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <ModuleContextProvider name={GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME}>
            {children}
        </ModuleContextProvider>
    );
}
