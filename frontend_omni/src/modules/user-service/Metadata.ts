import type { ModuleMetadata } from "@/moduleif/moduleSystemService";
import { GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME } from "@/moduleif/moduleContextProvider";
import { UserServiceContextProvider } from "./UserServiceContextProvider";

export const Metadata: ModuleMetadata = {
    version: "1.0.0",
    description:
        "User management module providing user data and related services",
    author: "ModAI Team",
    dependentClasses: [],
    exports: {
        [GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME]: UserServiceContextProvider,
    },
};
