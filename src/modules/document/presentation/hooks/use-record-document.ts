"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

import { RecordDocumentPreviewPayload } from "../types/record-document";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type LoadingPhase = "loading" | "compiling";

interface ApiSuccess {
  data: RecordDocumentPreviewPayload;
}

interface ApiFailure {
  error?: {
    code?: string;
    message?: string;
  };
}

interface ApiResult<T> {
  ok: boolean;
  payload?: T;
  status: number;
  error?: string;
}

function areTemplateBlocksEqual(left: TemplateBlocks, right: TemplateBlocks): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(input, init);
  const json = (await response.json().catch(() => null)) as ApiSuccess | ApiFailure | null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        (json && "error" in json ? json.error?.message : null) ??
        "No fue posible completar la operación",
    };
  }

  return {
    ok: true,
    payload: (json as ApiSuccess).data as T,
    status: response.status,
  };
}

export function useRecordDocument(params: {
  collectionId: string;
  recordId: string;
  templateId: string;
}) {
  const endpointBase = `/api/collections/${params.collectionId}/records/${params.recordId}/documents/${params.templateId}`;

  const [payload, setPayload] = useState<RecordDocumentPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [regenerating, setRegenerating] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);

  const payloadRef = useRef<RecordDocumentPreviewPayload | null>(null);
  const documentVersionRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const queuedBlocksRef = useRef<TemplateBlocks | null>(null);
  const isMountedRef = useRef(true);
  const latestEditedBlocksRef = useRef<TemplateBlocks | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const applyPayload = useCallback(
    (nextPayload: RecordDocumentPreviewPayload, hardReset: boolean) => {
      payloadRef.current = nextPayload;
      documentVersionRef.current = nextPayload.document.version;
      setPayload(nextPayload);
      setError(null);
      if (hardReset) {
        setEditorRevision((current) => current + 1);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadingPhase("loading");
    setError(null);

    const getResult = await requestJson<RecordDocumentPreviewPayload>(endpointBase);
    if (getResult.ok && getResult.payload) {
      applyPayload(getResult.payload, true);
      setLoading(false);
      return;
    }

    if (getResult.status !== 404) {
      setError(getResult.error ?? "No fue posible cargar el documento");
      setLoading(false);
      return;
    }

    setLoadingPhase("compiling");
    const compileResult = await requestJson<RecordDocumentPreviewPayload>(
      `${endpointBase}/compile`,
      {
        method: "POST",
      },
    );

    if (!compileResult.ok || !compileResult.payload) {
      setError(compileResult.error ?? "No fue posible compilar el documento");
      setLoading(false);
      return;
    }

    applyPayload(compileResult.payload, true);
    setLoading(false);
  }, [applyPayload, endpointBase]);

  useEffect(() => {
    const tmr = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(tmr);
  }, [load]);

  const saveDocument = useCallback(
    async function saveDocument(editedBlocks: TemplateBlocks): Promise<boolean> {
      const currentPayload = payloadRef.current;
      if (!currentPayload?.permissions.canUpdate) return true;
      const expectedVersion = documentVersionRef.current ?? currentPayload.document.version;
      const optimisticNextVersion = expectedVersion + 1;

      isSavingRef.current = true;
      queuedBlocksRef.current = null;
      documentVersionRef.current = optimisticNextVersion;

      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      if (isMountedRef.current) setSaveStatus("saving");

      const saveResult = await requestJson<RecordDocumentPreviewPayload>(endpointBase, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editedBlocks,
          version: expectedVersion,
        }),
      });

      if (!isMountedRef.current) {
        isSavingRef.current = false;
        return false;
      }

      if (!saveResult.ok) {
        queuedBlocksRef.current = null;
        isSavingRef.current = false;
        documentVersionRef.current = expectedVersion;

        if (saveResult.status === 409) {
          await load();
          setSaveStatus("error");
          setError("El documento cambió mientras editabas. Se recargó la última versión.");
          return false;
        }

        setSaveStatus("error");
        setError(saveResult.error ?? "No fue posible guardar el documento");
        return false;
      }

      const nextPayload = saveResult.payload;
      if (saveResult.payload) {
        documentVersionRef.current = saveResult.payload.document.version;
        applyPayload(saveResult.payload, false);
      } else {
        documentVersionRef.current = optimisticNextVersion;
      }

      const pendingBlocks = queuedBlocksRef.current;
      queuedBlocksRef.current = null;
      isSavingRef.current = false;

      if (
        pendingBlocks &&
        nextPayload &&
        !areTemplateBlocksEqual(pendingBlocks, nextPayload.document.editedBlocks)
      ) {
        return saveDocument(pendingBlocks);
      }

      setSaveStatus("saved");

      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      statusTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setSaveStatus("idle");
        }
      }, 2000);

      return true;
    },
    [applyPayload, endpointBase, load],
  );

  const startSave = useCallback(
    (editedBlocks: TemplateBlocks) => {
      const savePromise = saveDocument(editedBlocks).finally(() => {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
      });

      savePromiseRef.current = savePromise;
      return savePromise;
    },
    [saveDocument],
  );

  const handleBlocksChange = useCallback(
    (editedBlocks: TemplateBlocks) => {
      if (!payloadRef.current?.permissions.canUpdate) return;
      latestEditedBlocksRef.current = editedBlocks;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (!isSavingRef.current) {
        setSaveStatus("idle");
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;

        if (isSavingRef.current) {
          queuedBlocksRef.current = editedBlocks;
          return;
        }

        void startSave(editedBlocks);
      }, 1200);
    },
    [startSave],
  );

  const flushPendingSave = useCallback(async () => {
    if (!payloadRef.current?.permissions.canUpdate) {
      return true;
    }

    const latestEditedBlocks = latestEditedBlocksRef.current;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;

      if (latestEditedBlocks) {
        if (isSavingRef.current) {
          queuedBlocksRef.current = latestEditedBlocks;
        } else {
          return startSave(latestEditedBlocks);
        }
      }
    }

    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    return true;
  }, [startSave]);

  const regenerate = useCallback(async () => {
    if (!payloadRef.current?.permissions.canUpdate) return false;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setRegenerating(true);
    setError(null);

    const regenerateResult = await requestJson<RecordDocumentPreviewPayload>(
      `${endpointBase}/regenerate`,
      {
        method: "POST",
      },
    );

    setRegenerating(false);

    if (!regenerateResult.ok || !regenerateResult.payload) {
      setError(regenerateResult.error ?? "No fue posible regenerar el documento");
      return false;
    }

    applyPayload(regenerateResult.payload, true);
    setSaveStatus("idle");
    return true;
  }, [applyPayload, endpointBase]);

  return {
    payload,
    loading,
    loadingPhase,
    error,
    saveStatus,
    regenerating,
    editorRevision,
    handleBlocksChange,
    flushPendingSave,
    regenerate,
    reload: load,
    pdfUrl: `${endpointBase}/pdf`,
  };
}
