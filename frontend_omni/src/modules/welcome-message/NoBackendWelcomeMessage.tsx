import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/shadcn/components/ui/alert";

export default function NoBackendWelcomeMessage() {
    const { t } = useTranslation("welcome-message");

    return (
        <div className="flex flex-col items-center justify-center gap-4 h-full">
            <div className="text-center">
                <div className="text-muted-foreground mb-2">
                    <img
                        src="/modai.svg"
                        className="size-14 mx-auto"
                        alt={t("logoAlt", { defaultValue: "modAI logo" })}
                    />
                </div>
                <div className="space-y-1">
                    <h3 className="font-medium text-xl">
                        {t("welcome.title", {
                            defaultValue: "Welcome to modAI Chat",
                        })}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        {t("welcome.description", {
                            defaultValue:
                                "This chat interface operates entirely in your browser. It communicates directly with your chosen AI provider.",
                        })}
                    </p>
                </div>
            </div>
            <Alert className="max-w-md border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <Info className="size-4" />
                <AlertDescription>
                    {t("welcome.info", {
                        defaultValue:
                            "Data like provider information is only stored in your browser.",
                    })}
                </AlertDescription>
            </Alert>
        </div>
    );
}
