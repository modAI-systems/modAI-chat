import { useTranslation } from "react-i18next";

interface DefaultErrorPageProps {
    error?: Error;
}

export function DefaultErrorPage({ error }: DefaultErrorPageProps) {
    const { t } = useTranslation("main-layout");

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md mx-auto text-center p-6">
                <div className="mb-8">
                    <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <svg
                            className="h-12 w-12 text-destructive"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            role="img"
                            aria-label={t("errorIcon", {
                                defaultValue: "Error icon",
                            })}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t("errorTitle", {
                            defaultValue: "Something went wrong",
                        })}
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        {t("errorDescription", {
                            defaultValue:
                                "We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.",
                        })}
                    </p>
                </div>

                {process.env.NODE_ENV === "development" && error && (
                    <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-left">
                        <h3 className="text-sm font-semibold text-destructive mb-2">
                            {t("errorDetails", {
                                defaultValue:
                                    "Error Details (Development Mode)",
                            })}
                        </h3>
                        <pre className="text-xs text-destructive whitespace-pre-wrap break-words">
                            {error.message}
                            {error.stack && (
                                <>
                                    {"\n\n"}
                                    {error.stack}
                                </>
                            )}
                        </pre>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={handleReload}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        {t("refreshPage", { defaultValue: "Refresh Page" })}
                    </button>
                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                    >
                        {t("goToHome", { defaultValue: "Go to Home" })}
                    </button>
                </div>
            </div>
        </div>
    );
}
