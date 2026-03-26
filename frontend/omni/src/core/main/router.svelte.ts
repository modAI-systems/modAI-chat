let currentPath = $state("/");

export function getCurrentPath(): string {
    return currentPath;
}

export function navigate(path: string) {
    currentPath = path;
}
