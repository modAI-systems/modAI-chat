import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/shadcn/components/ui/resizable";
import { useModules } from "@/modules/module-system";
import type { ComponentType } from "react";
import { useChatSidePanels } from ".";

export function ChatLayout() {
    const modules = useModules();
    const ChatMiddlePane = modules.getOne<ComponentType>("ChatMiddlePane");
    const { LeftPanel, RightPanel } = useChatSidePanels();

    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
                defaultSize={15}
                minSize={15}
                maxSize={40}
                hidden={!LeftPanel}
            >
                {LeftPanel && <LeftPanel />}
            </ResizablePanel>
            <ResizableHandle withHandle hidden={!LeftPanel} />
            <ResizablePanel>
                {ChatMiddlePane && <ChatMiddlePane />}
            </ResizablePanel>
            <ResizableHandle withHandle hidden={!RightPanel} />
            <ResizablePanel
                defaultSize={15}
                minSize={15}
                maxSize={40}
                hidden={!RightPanel}
            >
                {RightPanel && <RightPanel />}
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
