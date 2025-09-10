import { SidebarMenuItem } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { UserDisplay } from "./UserDisplay";
import { getCurrentUser, type User } from "@/services/userService";

export function UserDisplaySidebarItem() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchUser = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const userData = await getCurrentUser();

                if (isMounted) {
                    setUser(userData);
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch user');
                    // Set fallback user data
                    setUser({
                        id: 'unknown',
                        email: '',
                        full_name: 'Unknown'
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchUser();

        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <SidebarMenuItem>
                <UserDisplay username="Loading..." userEmail="" />
            </SidebarMenuItem>
        );
    }

    if (error || !user) {
        return (
            <SidebarMenuItem>
                <UserDisplay username="Error loading user" userEmail="" />
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <UserDisplay
                username={user.full_name || user.email}
                userEmail={user.email}
            />
        </SidebarMenuItem>
    );
}
