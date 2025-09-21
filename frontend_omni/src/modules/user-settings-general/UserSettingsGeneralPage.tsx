import { useSession } from "@/moduleif/sessionContext";
import { Button } from "@/components/ui/button";
import { useModules } from "@/contexts/ModuleManagerContext";

export function UserSettingsGeneralPage() {
    const { session } = useSession();
    const modules = useModules();
    const userSettingsRows = modules.getComponentsByName("UserSettingsRow");

    if (!session) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please log in to access user settings.</p>
            </div>
        );
    }

    const handleSave = () => {
        console.log("Save settings");
        // TODO: Implement settings save functionality
    };

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-4 w-full">
                {userSettingsRows.map((UserSettingsRow, index) => (
                    <div key={index} className="flex w-full py-2 border-b">
                        <UserSettingsRow />
                    </div>
                ))}
            </div>

            {/* Fixed bottom button area */}
            <div className="border-t p-4 w-full">
                <Button onClick={handleSave}>
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
