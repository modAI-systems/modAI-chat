import { GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME } from "@/moduleif/moduleContextProvider";
import type { ModuleMetadata } from "@/moduleif/moduleSystemService";
import { SessionContextProvider } from "./SessionContextProvider";

export const Metadata: ModuleMetadata = {
    version: "1.0.0",
    description:
        "Session management module that maintains user session state in the browser",
    author: "ModAI Team",
    dependentClasses: [],
    exports: {
        [GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME]: SessionContextProvider,
    },
};
