import { Label } from "@/shadcn/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shadcn/components/ui/select";
import { useTheme } from "@/moduleif/theme";
import { useUserSettings } from "@/moduleif/userSettingsService";

export function UserSettingsRow() {
    return <div className="flex items-center justify-between w-full">
        <Label className="text-sm font-medium text-foreground">
            Theme
        </Label>
        <ThemeSettings />
    </div>
}

function ThemeSettings() {
    const { theme, setTheme, availableThemes } = useTheme();
    const settings = useUserSettings();

    const handleValueChange = (newValue: string) => {
        settings.updateModuleSettings("theme", { theme: newValue });
        setTheme(newValue);
    };

    const capitalizeTheme = (theme: string) => {
        return theme.charAt(0).toUpperCase() + theme.slice(1);
    };

    return (
        <Select value={theme} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
                {availableThemes.map((themeValue) => (
                    <SelectItem key={themeValue} value={themeValue}>
                        {capitalizeTheme(themeValue)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
