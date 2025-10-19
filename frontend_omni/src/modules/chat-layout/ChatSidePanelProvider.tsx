import { useState, type ComponentType, type ReactNode } from "react";
import { PanelsContext } from ".";

export default function ChatSidePanelProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [LeftContent, setLeftContent] = useState<ComponentType | null>(null);
    const [RightContent, setRightContent] = useState<ComponentType | null>(
        null
    );

    return (
        <PanelsContext.Provider
            value={{
                LeftPanel: LeftContent,
                setLeftPanel: setLeftContent,
                RightPanel: RightContent,
                setRightPanel: setRightContent,
            }}
        >
            {children}
        </PanelsContext.Provider>
    );
}
