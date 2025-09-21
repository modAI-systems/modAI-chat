import { useTheme } from "@/moduleif/theme";
import { useUserSettings } from "@/moduleif/userSettingsService";


export function BackgroundComponent() {
    const theme = useTheme();
    const config = useUserSettings()

    const themeConfig = config.getModuleSettings("theme") || {};
    const themeName = themeConfig.theme;

    // If theme name doesn't exist or theme structure is not valid, return empty fragment
    if (!themeName || typeof themeName !== 'string') {
        return <></>;
    }

    theme.setTheme(themeName);

    // You can now use themeName for your logic
    // For now, returning empty fragment as requested
    return <></>;
}
