import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Load all translation files using Vite's glob import
const translationModules = import.meta.glob("/src/modules/*/locales/*.json", {
    eager: true,
}) as Record<string, { default: Record<string, string> }>;

// Build resources object from loaded modules
const resources: Record<string, Record<string, Record<string, string>>> = {};

for (const [path, module] of Object.entries(translationModules)) {
    const match = path.match(new RegExp("/src/modules/([^/]+)/locales/([^/]+)\\.json$"));
    if (match) {
        const [, namespace, language] = match;
        if (!resources[language]) {
            resources[language] = {};
        }
        resources[language][namespace] = module.default || module;
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        lng: "en",
        debug: process.env.NODE_ENV === "development",

        interpolation: {
            escapeValue: false, // React already escapes
        },

        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
        },

        defaultNS: "common",
        returnEmptyString: false,
    });

export default i18n;
