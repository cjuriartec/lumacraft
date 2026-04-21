export const CURRENT_WORKSPACE_SELECTION_KEY = "lumacraft.currentWorkspaceId";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function readCurrentWorkspaceSelection(): string | null {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") {
    return null;
  }

  return window.localStorage.getItem(CURRENT_WORKSPACE_SELECTION_KEY);
}

export function persistCurrentWorkspaceSelection(workspaceId: string) {
  if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
    window.localStorage.setItem(CURRENT_WORKSPACE_SELECTION_KEY, workspaceId);
  }

  if (typeof document !== "undefined") {
    document.cookie = `${CURRENT_WORKSPACE_SELECTION_KEY}=${encodeURIComponent(
      workspaceId,
    )}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
  }
}

export function clearCurrentWorkspaceSelection() {
  if (typeof window !== "undefined" && typeof window.localStorage?.removeItem === "function") {
    window.localStorage.removeItem(CURRENT_WORKSPACE_SELECTION_KEY);
  }

  if (typeof document !== "undefined") {
    document.cookie = `${CURRENT_WORKSPACE_SELECTION_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
