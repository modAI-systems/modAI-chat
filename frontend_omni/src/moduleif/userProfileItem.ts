/**
 * Module Name: User Profile Item
 *
 * Module Types: SidebarFooterItem
 *
 * Description: This module provides user profile display functionality,
 *      showing user information in the sidebar footer area.
 *
 * What this module offers to users: User profile display component for the sidebar footer
 *
 * What this module demands when used: UserDisplayProps
 *
 * What this module demands from other modules: None
 *
 * Implementation Notes: The actual module implementation for this interface
 *     must create a SidebarFooterItem component that displays user information
 *     compact format suitable for the sidebar footer.
 */


/**
 * Props interface for the UserDisplay component
 */
export interface UserDisplayProps {
    username: string
    userEmail: string
}
