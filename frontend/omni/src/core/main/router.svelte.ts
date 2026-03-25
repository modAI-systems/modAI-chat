export const AppRoute = {
    Chat: "/chat",
    Providers: "/providers",
    Tools: "/tools",
} as const;

export type AppRoute = (typeof AppRoute)[keyof typeof AppRoute];

let currentRoute = $state<AppRoute>(AppRoute.Chat);

export function getCurrentRoute(): AppRoute {
    return currentRoute;
}

export function navigate(path: string) {
    currentRoute = parseRoute(path);
}

function parseRoute(path: string): AppRoute {
    switch (path) {
        case AppRoute.Providers:
            return AppRoute.Providers;
        case AppRoute.Tools:
            return AppRoute.Tools;
        default:
            return AppRoute.Chat;
    }
}
