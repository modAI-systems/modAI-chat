import { useSession } from "@/moduleif/sessionContext";

export function UserSettingsGeneralPage() {
    const { session } = useSession();

    if (!session) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please log in to access user settings.</p>
            </div>
        );
    }

    return (
        <div></div>
    );
}
