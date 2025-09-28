export function PageLoadingScreen() {
    return (
        <div className="min-h-screen h-screen flex items-center justify-center bg-background text-foreground">
            <img
                src="/modai.svg"
                alt="ModAI Logo"
                className="w-24 h-24 animate-pulse"
            />
        </div>
    )
}
