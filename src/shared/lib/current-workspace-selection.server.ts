import "server-only";

import { cookies } from "next/headers";

import { CURRENT_WORKSPACE_SELECTION_KEY } from "./current-workspace-selection";

export async function getCurrentWorkspaceSelection(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_WORKSPACE_SELECTION_KEY)?.value ?? null;
}

export async function matchesCurrentWorkspaceSelection(accountId: string): Promise<boolean> {
  const currentWorkspaceId = await getCurrentWorkspaceSelection();
  return !currentWorkspaceId || currentWorkspaceId === accountId;
}
