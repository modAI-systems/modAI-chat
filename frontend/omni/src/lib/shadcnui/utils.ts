import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type WithElementRef<T> = T & { ref?: HTMLElement | null };

export type WithoutChild<T> = Omit<T, "child" | "children">;

export type WithoutChildrenOrChild<T> = Omit<T, "child" | "children">;
