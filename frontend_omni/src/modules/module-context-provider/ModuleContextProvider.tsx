import type { ComponentType, ReactNode } from "react";
import { useModules } from "@/modules/module-system";

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
        (wrappedChildren, Component, index) => (
            <Component key={`${Component.name || "ContextProvider"}-${index}`}>
                {wrappedChildren}
            </Component>
        ),
        children,
    );
}
