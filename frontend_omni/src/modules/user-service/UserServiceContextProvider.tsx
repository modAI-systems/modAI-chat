import type React from "react";
import { UserServiceContext } from "@/modules/user-service";
import { HttpUserService } from "./HttpUserService";

export function UserServiceContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const userServiceInstance = new HttpUserService();
    return (
        <UserServiceContext value={userServiceInstance}>
            {children}
        </UserServiceContext>
    );
}
