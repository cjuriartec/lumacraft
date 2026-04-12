"use client";

import { useEffect } from "react";

import type { GuidancePageContext } from "@/modules/guidance/domain/guidance.types";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";

export function useGuidancePage(pageContext: GuidancePageContext) {
  const { registerPageContext } = useGuidance();
  const serialized = JSON.stringify(pageContext);

  useEffect(() => {
    registerPageContext(pageContext);

    return () => {
      registerPageContext(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, registerPageContext]);
}
