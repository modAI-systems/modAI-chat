import { ConversationEmptyState } from "@/modules/chat-layout/shadcn/components/ai-elements/conversation";
import { Alert, AlertDescription } from "@/shadcn/components/ui/alert";
import { MessageSquare, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NoBackendWelcomeMessage() {
    const { t } = useTranslation("welcome-message");

    return (
        <ConversationEmptyState
            title={t("welcome.title", {
                defaultValue: "Welcome to modAI Chat",
            })}
            description={t("welcome.description", {
                defaultValue:
                    "No Backend used. The interface only talks to your model provider directly.",
            })}
            icon={<MessageSquare className="size-8" />}
        >
            <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                    <div className="text-muted-foreground mb-2">
                        <MessageSquare className="size-8 mx-auto" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium text-sm">
                            {t("welcome.title", {
                                defaultValue: "Welcome to modAI Chat",
                            })}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {t("welcome.description", {
                                defaultValue:
                                    "The Chat interface is completely functional without backend. It only talks to your model provider directly.",
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
        </ConversationEmptyState>
    );
}
