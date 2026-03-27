let currentPath = $state(window.location.pathname || "/");
let homePath = $state("/");

export function getCurrentPath(): string {
    return currentPath;
}

export function navigate(path: string) {
    if (path === currentPath) return;
    history.pushState(null, "", path);
    currentPath = path;
}

export function setHomePath(path: string) {
    homePath = path;
}

export function navigateHome() {
    navigate(homePath);
}

function onPopState() {
    currentPath = window.location.pathname || "/";
}

window.addEventListener("popstate", onPopState);
