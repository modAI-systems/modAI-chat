import { useModules } from "@/modules/module-system";
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
        children,
    );
}
