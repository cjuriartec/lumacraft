"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";

export function useCollectionWorkspaceGuard(collectionAccountId?: string | null) {
  const router = useRouter();
  const { currentWorkspace, loading } = useWorkspace();

  const isWorkspaceMismatch = Boolean(
    !loading &&
    collectionAccountId &&
    currentWorkspace?.id &&
    currentWorkspace.id !== collectionAccountId,
  );

  useEffect(() => {
    if (!isWorkspaceMismatch) {
      return;
    }

    router.replace("/collections");
  }, [isWorkspaceMismatch, router]);

  return isWorkspaceMismatch;
}
