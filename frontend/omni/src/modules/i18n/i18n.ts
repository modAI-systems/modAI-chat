import type { InitOptions } from "i18next";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Load all translation files using Vite's glob import
const translationModules = import.meta.glob("/src/modules/*/locales/*.json", {
    eager: true,
}) as Record<string, { default: Record<string, unknown> }>;

// Build resources object from loaded modules
const resources: Record<string, Record<string, Record<string, unknown>>> = {};

for (const [path, module] of Object.entries(translationModules)) {
    const match = path.match(
        /\/src\/modules\/([^/]+)\/locales\/([^/]+)\.json$/,
    );
    if (match) {
        const [, namespace, language] = match;
        if (!resources[language]) {
            resources[language] = {};
        }
        resources[language][namespace] = module.default ?? module;
    }
}

const options: InitOptions = {
    resources,
    fallbackLng: "en",
    interpolation: {
        escapeValue: false,
    },

    detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
    },

    defaultNS: false,
    returnEmptyString: false,
};

i18n.use(LanguageDetector).init(options);

export default i18n;
