"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRecords } from "@/modules/collection/presentation/hooks/use-records";
import {
  TemplatePreviewBlockState,
  TemplatePreviewEvent,
} from "@/modules/template/application/services/template-preview.types";
import { getTemplatePreviewBlockMetadata } from "@/modules/template/application/services/template-preview-block-metadata";
import { isTemplateBlocks, TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { buildStructuredPreviewFromStates } from "../lib/template-preview-placeholders";

interface UseTemplatePreviewParams {
  templateId: string;
  collectionId?: string | null;
  accountId?: string;
  enabled?: boolean;
}

function parseSseChunk(chunk: string): Array<{ event: string; data: string }> {
  const blocks = chunk.split("\n\n").filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLines = lines.filter((line) => line.startsWith("data:"));

      if (!eventLine || dataLines.length === 0) return null;

      return {
        event: eventLine.replace("event:", "").trim(),
        data: dataLines.map((line) => line.replace("data:", "").trim()).join("\n"),
      };
    })
    .filter((item): item is { event: string; data: string } => item !== null);
}

export function useTemplatePreview({
  templateId,
  collectionId,
  accountId,
  enabled = true,
}: UseTemplatePreviewParams) {
  const { records, loading: recordsLoading } = useRecords(collectionId ?? "", { enabled });

  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [blockStates, setBlockStates] = useState<TemplatePreviewBlockState[]>([]);
  const [blocks, setBlocks] = useState<TemplateBlocks>([]);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const stagedOrderRef = useRef(getTemplatePreviewBlockMetadata([]));
  const stagedOutputsRef = useRef<Map<string, TemplateBlocks>>(new Map());
  const awaitingFirstResolvedRef = useRef(false);
  const isDoneRef = useRef(false);

  const availableRecords = useMemo(
    () => records.map((record) => ({ id: record.id, data: record.data })),
    [records],
  );

  useEffect(() => {
    if (availableRecords.length === 0) {
      setSelectedRecordId("");
      return;
    }

    const recordStillExists = availableRecords.some((record) => record.id === selectedRecordId);
    if (!selectedRecordId || !recordStillExists) {
      setSelectedRecordId(availableRecords[0].id);
    }
  }, [availableRecords, selectedRecordId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const updateBlockState = useCallback(
    (
      blockId: string,
      updater: (state: TemplatePreviewBlockState) => TemplatePreviewBlockState,
      fallback?: Partial<TemplatePreviewBlockState>,
    ) => {
      setBlockStates((currentStates) => {
        const hasExisting = currentStates.some((state) => state.blockId === blockId);
        if (!hasExisting) {
          const nextState = updater({
            blockId,
            blockIndex: fallback?.blockIndex ?? currentStates.length,
            blockType: fallback?.blockType ?? "unknown",
            status: fallback?.status ?? "pending",
            branch: fallback?.branch,
            itemCount: fallback?.itemCount,
            aiText: fallback?.aiText,
            message: fallback?.message,
          });
          return [...currentStates, nextState].sort(
            (left, right) => left.blockIndex - right.blockIndex,
          );
        }

        return currentStates
          .map((state) => (state.blockId === blockId ? updater(state) : state))
          .sort((left, right) => left.blockIndex - right.blockIndex);
      });
    },
    [],
  );

  const refreshStructuredBlocks = useCallback(() => {
    setBlocks(
      buildStructuredPreviewFromStates({
        order: stagedOrderRef.current,
        outputs: stagedOutputsRef.current,
        blockStates,
      }),
    );
  }, [blockStates]);

  useEffect(() => {
    if (
      !awaitingFirstResolvedRef.current &&
      !isDoneRef.current &&
      stagedOrderRef.current.length > 0
    ) {
      refreshStructuredBlocks();
    }
  }, [blockStates, refreshStructuredBlocks]);

  const generate = useCallback(
    async (sourceBlocks: TemplateBlocks): Promise<Result<void>> => {
      if (!collectionId) {
        const errorMsg = "Template has no linked collection";
        setError(errorMsg);
        return fail(new DomainError(errorMsg, "TEMPLATE_CONTEXT_NOT_FOUND"));
      }

      if (!selectedRecordId) {
        const errorMsg = "Select a record first";
        setError(errorMsg);
        return fail(new DomainError(errorMsg, "TEMPLATE_PREVIEW_INVALID_INPUT"));
      }

      if (!accountId) {
        const errorMsg = "No workspace selected";
        setError(errorMsg);
        return fail(new DomainError(errorMsg, "NO_WORKSPACE_SELECTED"));
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const initialOrder = getTemplatePreviewBlockMetadata(sourceBlocks);
      stagedOrderRef.current = initialOrder;
      stagedOutputsRef.current = new Map();
      awaitingFirstResolvedRef.current = true;
      isDoneRef.current = false;

      setLoading(true);
      setError(null);
      setWarnings([]);
      setRequestId(null);
      setBlockStates(
        initialOrder.map((meta) => ({
          ...meta,
          status: "pending" as const,
        })),
      );

      try {
        const response = await fetch(`/api/templates/${templateId}/preview/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            collectionId,
            recordId: selectedRecordId,
            blocks: sourceBlocks,
            options: {
              stream: true,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          const message = payload?.error?.message ?? "No fue posible generar el preview";
          setError(message);
          return fail(new DomainError(message, "TEMPLATE_COMPILE_ERROR"));
        }

        if (!response.body) {
          const message = "No se recibió stream del servidor";
          setError(message);
          return fail(new DomainError(message, "TEMPLATE_COMPILE_ERROR"));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (runIdRef.current !== runId) {
            continue;
          }

          buffer += decoder.decode(value, { stream: true });

          const completeLength = buffer.lastIndexOf("\n\n");
          if (completeLength < 0) {
            continue;
          }

          const completeChunk = buffer.slice(0, completeLength + 2);
          buffer = buffer.slice(completeLength + 2);
          const events = parseSseChunk(completeChunk);

          for (const event of events) {
            if (event.event === "ping") continue;

            let payload: TemplatePreviewEvent | null = null;
            try {
              payload = JSON.parse(event.data) as TemplatePreviewEvent;
            } catch {
              continue;
            }

            if (!payload || runIdRef.current !== runId) {
              continue;
            }

            switch (payload.type) {
              case "meta":
                setRequestId(payload.requestId);
                stagedOrderRef.current = payload.blocks;
                setBlockStates(
                  payload.blocks.map((meta) => ({
                    ...meta,
                    status: "pending",
                  })),
                );
                continue;
              case "pending":
                updateBlockState(
                  payload.blockId,
                  (state) => ({ ...state, status: "pending" }),
                  payload,
                );
                continue;
              case "branch_selected":
                updateBlockState(
                  payload.blockId,
                  (state) => ({
                    ...state,
                    branch:
                      payload.branch === "case"
                        ? `case ${payload.matchedValue ?? ""}`.trim()
                        : payload.branch,
                  }),
                  payload,
                );
                continue;
              case "items_resolved":
                updateBlockState(
                  payload.blockId,
                  (state) => ({ ...state, itemCount: payload.count }),
                  payload,
                );
                continue;
              case "ai_chunk":
                updateBlockState(
                  payload.blockId,
                  (state) => ({
                    ...state,
                    aiText: `${state.aiText ?? ""}${payload.text}`,
                  }),
                  payload,
                );
                continue;
              case "resolved":
                if (isTemplateBlocks(payload.blocks)) {
                  stagedOutputsRef.current.set(payload.blockId, payload.blocks);
                  updateBlockState(
                    payload.blockId,
                    (state) => ({ ...state, status: "resolved" }),
                    payload,
                  );
                  if (awaitingFirstResolvedRef.current) {
                    awaitingFirstResolvedRef.current = false;
                    refreshStructuredBlocks();
                  }
                }
                continue;
              case "done":
                setRequestId(payload.requestId);
                if (isTemplateBlocks(payload.blocks)) {
                  awaitingFirstResolvedRef.current = false;
                  setBlocks(payload.blocks);
                }
                setWarnings(payload.warnings);
                isDoneRef.current = true;
                setBlockStates((currentStates) =>
                  currentStates.map((state) =>
                    state.status === "error" ? state : { ...state, status: "resolved" },
                  ),
                );
                continue;
              case "error":
                setError(payload.message ?? "Error al generar preview");
                if (payload.blockId) {
                  updateBlockState(
                    payload.blockId,
                    (state) => ({
                      ...state,
                      status: "error",
                      message: payload.message,
                    }),
                    payload,
                  );
                }
                continue;
              default:
                continue;
            }
          }
        }

        return ok(undefined);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return fail(new DomainError("Preview cancelled", "ABORTED"));
        }

        const message = error instanceof Error ? error.message : "Unexpected preview error";
        setError(message);
        return fail(new DomainError(message, "TEMPLATE_COMPILE_ERROR"));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [
      accountId,
      collectionId,
      refreshStructuredBlocks,
      selectedRecordId,
      templateId,
      updateBlockState,
    ],
  );

  return {
    records: availableRecords,
    recordsLoading,
    selectedRecordId,
    setSelectedRecordId,
    loading,
    error,
    warnings,
    requestId,
    blockStates,
    blocks,
    generate,
    cancel,
  };
}
