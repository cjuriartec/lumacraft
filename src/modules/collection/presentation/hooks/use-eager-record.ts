"use client";

import { useCallback, useEffect, useState } from "react";

import { EagerLoadedRecord } from "../../domain/types/eager-loading.types";

interface UseEagerRecordOptions {
  depth?: number;
  enabled?: boolean;
}

export function useEagerRecord(
  collectionId: string,
  recordId: string,
  options: UseEagerRecordOptions = {},
) {
  const { depth = 2, enabled = true } = options;
  const [record, setRecord] = useState<EagerLoadedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || !collectionId || !recordId) {
        setRecord(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/collections/${encodeURIComponent(collectionId)}/records/${encodeURIComponent(recordId)}/eager-load?depth=${depth}`,
          {
            signal,
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "No se pudo cargar el registro.");
        }

        const payload = (await response.json()) as EagerLoadedRecord;
        setRecord(payload);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setRecord(null);
        setError(err instanceof Error ? err.message : "No se pudo cargar el registro.");
      } finally {
        setLoading(false);
      }
    },
    [collectionId, depth, enabled, recordId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchRecord(controller.signal);
    return () => controller.abort();
  }, [fetchRecord]);

  return {
    record,
    loading,
    error,
    refresh: () => fetchRecord(),
  };
}
