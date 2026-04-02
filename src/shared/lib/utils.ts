import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects the platform and returns the correct keyboard shortcut modifier.
 * @returns '⌘' for Mac, 'Ctrl+' for others.
 */
export function getShortcutText() {
  if (typeof window === "undefined") return "Ctrl+";
  const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  return isMac ? "⌘" : "Ctrl+";
}
