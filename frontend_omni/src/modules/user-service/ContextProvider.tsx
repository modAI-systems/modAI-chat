import React from 'react';
import { UserServiceContext } from "@/moduleif/userService";
import { HttpUserService } from './HttpUserService';

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const userServiceInstance = new HttpUserService();
    return (
        <UserServiceContext value={userServiceInstance}>
            {children}
        </UserServiceContext>
    );
}
