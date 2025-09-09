
// This event opens/closed the sidbar.
// If the sidebar is not open, it will open it with the provided component.
// If the sidebar is open and the provided id is the same as the opened id, it will close the sidebar.
// If the sidebar is open and the provided id is different, it will switch to the provided component.
export interface ToggleSidebar {
    sidebarId: string
    sidebarComponent: React.ComponentType<unknown>
}
