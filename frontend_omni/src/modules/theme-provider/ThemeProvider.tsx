import React, { useEffect, useState } from "react";
import { ThemeContext } from "@/modules/theme-provider";
import type { ThemeContextType } from "@/modules/theme-provider";

const availableThemes: string[] = ["light", "dark"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<string>(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;

        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    });

    useEffect(() => {
        const root = document.documentElement;

        // Remove previous theme class
        root.classList.remove("light", "dark");

        // Add current theme class
        root.classList.add(theme);

        // Store in localStorage
        localStorage.setItem("theme", theme);
    }, [theme]);

    const contextValue: ThemeContextType = {
        theme,
        setTheme,
        availableThemes,
    };

    return <ThemeContext value={contextValue}>{children}</ThemeContext>;
}
