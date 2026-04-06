import i18nInstance from "./i18n.js";

class I18nStore {
    changeCount = $state(0);

    constructor() {
        i18nInstance.on("languageChanged", () => {
            this.changeCount++;
        });
    }

    getT(ns: string) {
        return (key: string, options?: Record<string, unknown>): unknown => {
            // Reading this reactive value establishes a Svelte tracking dependency,
            // causing templates to re-render when the language changes.
            void this.changeCount;
            return i18nInstance.t(key, { ns, ...options });
        };
    }
}

const i18nStore = new I18nStore();

export function getT(ns: string) {
    return i18nStore.getT(ns);
}

export const i18n = i18nInstance;
