import { useTranslation } from "react-i18next";

export function PageLoadingScreen() {
    const { t } = useTranslation("main-layout");

    return (
        <div className="min-h-screen h-screen flex items-center justify-center bg-background text-foreground">
            <img
                src="/modai.svg"
                alt={t("modaiLogo", { defaultValue: "ModAI Logo" })}
                className="w-24 h-24 animate-pulse"
            />
        </div>
    );
}
