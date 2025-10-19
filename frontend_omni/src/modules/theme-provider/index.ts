import { createContext, useContext } from "react";

export interface ThemeContextType {
    theme: string;
    setTheme: (theme: string) => void;
    availableThemes: string[];
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined,
);

/**
 * Hook to access the theme context from any component
 *
 * @returns ThemeContextType instance
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
