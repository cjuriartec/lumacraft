"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AccountAISettingsDto,
  UpdateAccountAISettingsDto,
} from "../../application/types/account-ai-settings.dto";

interface UseAccountAISettingsResult {
  settings: AccountAISettingsDto | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (payload: UpdateAccountAISettingsDto) => Promise<AccountAISettingsDto>;
  testConnection: (providerId: string, apiKey?: string) => Promise<void>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "No se pudo completar la solicitud");
  }

  return payload.data;
}

export function useAccountAISettings(accountId?: string | null): UseAccountAISettingsResult {
  const [settings, setSettings] = useState<AccountAISettingsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setSettings(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await parseResponse<AccountAISettingsDto>(
        await fetch(`/api/accounts/${accountId}/ai-settings`, {
          method: "GET",
          cache: "no-store",
        }),
      );

      setSettings(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar la configuración",
      );
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (payload: UpdateAccountAISettingsDto) => {
      if (!accountId) {
        throw new Error("No workspace selected");
      }

      setSaving(true);
      setError(null);

      try {
        const data = await parseResponse<AccountAISettingsDto>(
          await fetch(`/api/accounts/${accountId}/ai-settings`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }),
        );

        setSettings(data);
        return data;
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "No se pudo guardar la configuración";
        setError(message);
        throw requestError;
      } finally {
        setSaving(false);
      }
    },
    [accountId],
  );
  
  const testConnection = useCallback(
    async (providerId: string, apiKey?: string) => {
      if (!accountId) {
        throw new Error("No workspace selected");
      }

      setError(null);

      try {
        await parseResponse<{ success: boolean }>(
          await fetch(`/api/accounts/${accountId}/ai-settings/test-connection`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ providerId, apiKey }),
          }),
        );
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Error al validar la conexión";
        setError(message);
        throw requestError;
      }
    },
    [accountId],
  );

  return {
    settings,
    loading,
    saving,
    error,
    refresh,
    save,
    testConnection,
  };
}
