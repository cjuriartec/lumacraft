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
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

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
    async (editedBlocks: TemplateBlocks) => {
      const currentPayload = payloadRef.current;
      if (!currentPayload?.permissions.canUpdate) return;

      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      if (isMountedRef.current) setSaveStatus("saving");

      const saveResult = await requestJson<RecordDocumentPreviewPayload>(endpointBase, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editedBlocks,
          version: currentPayload.document.version,
        }),
      });

      if (!isMountedRef.current || requestId !== saveRequestIdRef.current) {
        return;
      }

      if (!saveResult.ok) {
        if (saveResult.status === 409) {
          await load();
          setSaveStatus("error");
          setError("El documento cambió mientras editabas. Se recargó la última versión.");
          return;
        }

        setSaveStatus("error");
        setError(saveResult.error ?? "No fue posible guardar el documento");
        return;
      }

      if (saveResult.payload) {
        applyPayload(saveResult.payload, false);
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
    },
    [applyPayload, endpointBase, load],
  );

  const handleBlocksChange = useCallback(
    (editedBlocks: TemplateBlocks) => {
      if (!payloadRef.current?.permissions.canUpdate) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("idle");
      saveTimeoutRef.current = setTimeout(() => {
        void saveDocument(editedBlocks);
      }, 1200);
    },
    [saveDocument],
  );

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
    regenerate,
    reload: load,
    pdfUrl: `${endpointBase}/pdf`,
  };
}
