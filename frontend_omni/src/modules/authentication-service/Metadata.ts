import type { ModuleMetadata } from "@/moduleif/moduleSystemService";
import { GlobalContextProvider } from "./GlobalContextProvider";
import { GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME } from "@/moduleif/moduleContextProvider";

export const Metadata: ModuleMetadata = {
    version: "1.0.0",
    description:
        "Authentication service providing login, signup, and logout functionality",
    author: "ModAI Team",
    dependentClasses: [],
    exports: {
        [GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME]: GlobalContextProvider,
    },
};
