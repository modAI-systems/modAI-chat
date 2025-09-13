import { Avatar, AvatarFallback } from "../../ui/avatar"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "../../ui/tooltip"
import { useSidebar } from "../../ui/sidebar"

interface UserDisplayProps {
    username: string
    userEmail: string
}

export function UserDisplay({ username, userEmail }: UserDisplayProps) {
    const { isMobile, state } = useSidebar()
    const userInitials = username
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm transition-colors">
                    <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{username}</span>
                        {userEmail && (
                            <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                        )}
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
                <p>{username}</p>
            </TooltipContent>
        </Tooltip>
    )
}
