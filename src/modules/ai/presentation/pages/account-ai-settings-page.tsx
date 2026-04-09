"use client";

import { debounce } from "lodash";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  CloudUpload,
  KeyRound,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AccountAISettingsDto,
  UpdateAccountAISettingsDto,
} from "@/modules/ai/application/types/account-ai-settings.dto";
import { AI_PROVIDER_IDS, AIProviderId } from "@/modules/ai/domain/types/ai-provider.types";
import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Switch } from "@/shared/presentation/components/ui/switch";
import { TagInput } from "@/shared/presentation/components/ui/tag-input";
import { Textarea } from "@/shared/presentation/components/ui/textarea";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { useAccountAISettings } from "../hooks/use-account-ai-settings";

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  GEMINI: "Google Gemini",
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
};

function cloneSettingsToDraft(settings: AccountAISettingsDto): UpdateAccountAISettingsDto {
  return {
    defaultProvider: settings.defaultProvider,
    defaultModel: settings.defaultModel,
    defaultTemperature: settings.defaultTemperature,
    defaultMaxTokens: settings.defaultMaxTokens,
    requestTimeoutMs: settings.requestTimeoutMs,
    featureTemplateAI: settings.featureTemplateAI,
    featureTemplateLogic: settings.featureTemplateLogic,
    templatePreviewTimeoutMs: settings.templatePreviewTimeoutMs,
    templatePreviewMaxAIBlocks: settings.templatePreviewMaxAIBlocks,
    systemPrompt: settings.systemPrompt,
    enableFallback: settings.enableFallback,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: settings.fallbackModel,
    providerOptions: JSON.parse(JSON.stringify(settings.providerOptions)),
  };
}

function normalizeDraftModel(draft: UpdateAccountAISettingsDto): UpdateAccountAISettingsDto {
  const allowedModels = draft.providerOptions[draft.defaultProvider]?.allowedModels ?? [];
  if (allowedModels.length === 0) {
    return draft;
  }

  if (allowedModels.includes(draft.defaultModel)) {
    return draft;
  }

  return {
    ...draft,
    defaultModel: allowedModels[0],
  };
}

export default function AccountAISettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { isOwner, isSuperAdmin } = usePermissions();
  const { settings, loading, saving, error, save, testConnection } = useAccountAISettings(
    currentWorkspace?.id,
  );

  const [draft, setDraft] = useState<UpdateAccountAISettingsDto | null>(null);
  const [secretInputs, setSecretInputs] = useState<Partial<Record<AIProviderId, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [testingConnection, setTestingConnection] = useState<
    Partial<Record<AIProviderId, boolean>>
  >({});
  const [testResults, setTestResults] = useState<
    Partial<Record<AIProviderId, { success: boolean; message?: string } | null>>
  >({});

  useBreadcrumbs([{ label: "Configuración", href: "/settings" }, { label: "IA" }]);

  useEffect(() => {
    if (!settings) return;

    const resetId = window.setTimeout(() => {
      setDraft(cloneSettingsToDraft(settings));
      setSecretInputs({});
    }, 0);

    return () => {
      window.clearTimeout(resetId);
    };
  }, [settings]);

  const [lastSavedDraft, setLastSavedDraft] = useState<string | null>(null);
  const [lastSavedSecrets, setLastSavedSecrets] = useState<string | null>(null);

  const canEdit = isOwner || isSuperAdmin;

  const handleSave = useCallback(
    async (currentDraft: UpdateAccountAISettingsDto, currentSecrets: Record<string, string>) => {
      const payload = normalizeDraftModel({
        ...currentDraft,
        providerSecretsInput: currentSecrets,
      });

      try {
        await save(payload);
        setLastSavedDraft(JSON.stringify(currentDraft));
        setLastSavedSecrets(JSON.stringify(currentSecrets));
        setSuccessMessage("Configuración guardada");
        window.setTimeout(() => setSuccessMessage(null), 2500);
      } catch {
        // Error is handled by useAccountAISettings
      }
    },
    [save],
  );

  const debouncedSave = useMemo(() => debounce(handleSave, 500), [handleSave]);

  useEffect(() => {
    if (!draft || !settings) return;

    // Initial load: set the baseline for what's already saved
    if (lastSavedDraft === null) {
      setLastSavedDraft(JSON.stringify(draft));
      setLastSavedSecrets(JSON.stringify(secretInputs));
      return;
    }

    const currentDraftStr = JSON.stringify(draft);
    const currentSecretsStr = JSON.stringify(secretInputs);

    // Only save if something actually changed from the last saved state
    if (currentDraftStr !== lastSavedDraft || currentSecretsStr !== lastSavedSecrets) {
      void debouncedSave(draft, secretInputs as Record<string, string>);
    }
  }, [draft, secretInputs, debouncedSave, settings, lastSavedDraft, lastSavedSecrets]);

  const currentProviderModels = useMemo(() => {
    if (!draft) return [];
    return draft.providerOptions[draft.defaultProvider]?.allowedModels ?? [];
  }, [draft]);

  const handleTestConnection = async (providerId: AIProviderId) => {
    setTestingConnection((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      await testConnection(providerId, secretInputs[providerId]);
      setTestResults((prev) => ({ ...prev, [providerId]: { success: true } }));
    } catch (e) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: e instanceof Error ? e.message : "Error desconocido",
        },
      }));
    } finally {
      setTestingConnection((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
          Configuración de IA
        </h1>
        <p className="mt-3 text-sm text-foreground/70">
          Selecciona un workspace para gestionar su configuración de IA.
        </p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Workspace
        </p>
        <h1 className="mt-3 text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
          Configuración de IA
        </h1>
        <p className="mt-3 rounded-xl border border-border/60 bg-surface px-5 py-4 text-sm text-foreground/70">
          Solo el owner o un admin del workspace puede editar esta configuración.
        </p>
      </div>
    );
  }

  if (loading || !draft || !settings) {
    return (
      <div className="flex h-80 items-center justify-center">
        <RotateCw className="animate-spin text-primary/60" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-8 py-10">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Workspace AI
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground/90">
              Configuración de IA
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">
              Gestiona proveedor, modelos, timeouts, y secrets cifrados para{" "}
              <strong>{currentWorkspace.name}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-surface/50 px-4 py-2 shadow-sm backdrop-blur-sm">
            {saving ? (
              <>
                <CloudUpload className="animate-bounce text-primary" size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Sincronizando...
                </span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="text-destructive" size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                  Error de guardado
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-primary/70" size={16} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  Todo guardado
                </span>
              </>
            )}
          </div>
        </div>
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            {successMessage}
          </p>
        )}
      </div>

      <section className="grid gap-6 rounded-2xl border border-border/50 bg-surface p-6">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Proveedor por defecto</Label>
            <Select
              value={draft.defaultProvider}
              onValueChange={(nextValue) =>
                setDraft((current) =>
                  current
                    ? normalizeDraftModel({
                        ...current,
                        defaultProvider: nextValue as AIProviderId,
                      })
                    : current,
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona proveedor" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_IDS.map((providerId) => (
                  <SelectItem key={providerId} value={providerId}>
                    {PROVIDER_LABELS[providerId]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Modelo por defecto</Label>
            <Select
              value={draft.defaultModel}
              onValueChange={(nextValue) =>
                setDraft((current) => (current ? { ...current, defaultModel: nextValue } : current))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona modelo" />
              </SelectTrigger>
              <SelectContent>
                {currentProviderModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Temperatura</Label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={draft.defaultTemperature}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        defaultTemperature: Number(event.target.value),
                      }
                    : current,
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Max tokens</Label>
            <Input
              type="number"
              min="1"
              value={draft.defaultMaxTokens}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        defaultMaxTokens: Number(event.target.value),
                      }
                    : current,
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Request timeout (ms)</Label>
            <Input
              type="number"
              min="1000"
              value={draft.requestTimeoutMs}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        requestTimeoutMs: Number(event.target.value),
                      }
                    : current,
                )
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Preview timeout (ms)</Label>
            <Input
              type="number"
              min="5000"
              value={draft.templatePreviewTimeoutMs}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        templatePreviewTimeoutMs: Number(event.target.value),
                      }
                    : current,
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Max AI blocks</Label>
            <Input
              type="number"
              min="1"
              value={draft.templatePreviewMaxAIBlocks}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        templatePreviewMaxAIBlocks: Number(event.target.value),
                      }
                    : current,
                )
              }
            />
          </div>
          <div className="grid gap-4 rounded-xl border border-border/40 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Template AI</p>
                <p className="text-xs text-foreground/60">Habilita bloques AI en preview.</p>
              </div>
              <Switch
                checked={draft.featureTemplateAI}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current ? { ...current, featureTemplateAI: checked } : current,
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Template Logic</p>
                <p className="text-xs text-foreground/60">
                  Habilita bloques condicionales, listas y switch.
                </p>
              </div>
              <Switch
                checked={draft.featureTemplateLogic}
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current ? { ...current, featureTemplateLogic: checked } : current,
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>System prompt de la cuenta</Label>
          <Textarea
            value={draft.systemPrompt}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, systemPrompt: event.target.value } : current,
              )
            }
            placeholder="Opcional. Si lo dejas vacío, Lumacraft usará su prompt interno por defecto."
            className="min-h-[140px] rounded-xl border-border/40 bg-background/70"
          />
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-border/50 bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Estabilidad y Fallback</h2>
            <p className="text-xs text-foreground/60">
              Configura un proveedor de respaldo en caso de que el principal falle o supere el
              timeout.
            </p>
          </div>
          <Switch
            checked={draft.enableFallback}
            onCheckedChange={(checked) =>
              setDraft((current) => (current ? { ...current, enableFallback: checked } : current))
            }
          />
        </div>

        {draft.enableFallback && (
          <div className="grid gap-6 border-t border-border/30 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Proveedor de Fallback</Label>
                <Select
                  value={draft.fallbackProvider}
                  onValueChange={(nextValue) =>
                    setDraft((current) => {
                      if (!current) return current;

                      const providerId = nextValue as AIProviderId;
                      const allowedModels =
                        current.providerOptions[providerId]?.allowedModels ?? [];
                      const fallbackModel = allowedModels[0] || "";

                      return {
                        ...current,
                        fallbackProvider: providerId,
                        fallbackModel,
                      };
                    })
                  }
                >
                  <SelectTrigger className="border-border/40 bg-background/50">
                    <SelectValue placeholder="Selecciona proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDER_IDS.filter((id) => id !== draft.defaultProvider).map(
                      (providerId) => (
                        <SelectItem key={providerId} value={providerId}>
                          {PROVIDER_LABELS[providerId]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Modelo de Fallback</Label>
                <Select
                  value={draft.fallbackModel}
                  onValueChange={(nextValue) =>
                    setDraft((current) =>
                      current ? { ...current, fallbackModel: nextValue } : current,
                    )
                  }
                >
                  <SelectTrigger className="border-border/40 bg-background/50">
                    <SelectValue placeholder="Selecciona modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(draft.providerOptions[draft.fallbackProvider]?.allowedModels ?? []).map(
                      (model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs leading-relaxed text-foreground/70">
                <span className="font-semibold text-primary">Nota de A/B Testing:</span> Al activar
                el fallback, Lumacraft monitoriza la tasa de éxito de{" "}
                <strong>{PROVIDER_LABELS[draft.defaultProvider]}</strong>. Si se detectan errores
                consecutivos o latencia excesiva, el tráfico se redirigirá automáticamente a
                <strong> {PROVIDER_LABELS[draft.fallbackProvider]}</strong> ({draft.fallbackModel})
                para garantizar la continuidad del servicio.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4">
        {AI_PROVIDER_IDS.map((providerId) => {
          const secretStatus = settings.providerSecrets[providerId];
          const allowedModels = draft.providerOptions[providerId]?.allowedModels ?? [];
          return (
            <div
              key={providerId}
              className="grid gap-4 rounded-2xl border border-border/50 bg-surface p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/15 bg-primary/10 p-2 text-primary">
                    <BrainCircuit size={16} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {PROVIDER_LABELS[providerId]}
                    </h2>
                    <p className="text-xs text-foreground/60">
                      Models permitidos y secret cifrado por workspace.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-foreground/60">
                    <p>{secretStatus.isConfigured ? "Configurado" : "Sin configurar"}</p>
                    {secretStatus.last4 && <p>Terminada en {secretStatus.last4}</p>}
                    {secretStatus.updatedAt && (
                      <p>Actualizada {new Date(secretStatus.updatedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-primary/20 text-xs hover:bg-primary/5 hover:text-primary"
                    onClick={() => handleTestConnection(providerId)}
                    disabled={testingConnection[providerId]}
                  >
                    {testingConnection[providerId] ? (
                      <RotateCw className="mr-1 animate-spin" size={12} />
                    ) : (
                      <BrainCircuit className="mr-1" size={12} />
                    )}
                    Validar conexión
                  </Button>
                </div>
              </div>

              {testResults[providerId] && (
                <div
                  className={`rounded-xl border px-4 py-2 text-xs ${
                    testResults[providerId]?.success
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResults[providerId]?.success
                    ? "Conexión exitosa. El proveedor está listo para usarse."
                    : `Error de conexión: ${testResults[providerId]?.message}`}
                </div>
              )}

              <div className="grid gap-2">
                <Label>Catálogo editable de modelos</Label>
                <TagInput
                  value={allowedModels}
                  onChange={(nextModels) =>
                    setDraft((current) =>
                      current
                        ? normalizeDraftModel({
                            ...current,
                            providerOptions: {
                              ...current.providerOptions,
                              [providerId]: {
                                ...current.providerOptions[providerId],
                                allowedModels: nextModels,
                              },
                            },
                          })
                        : current,
                    )
                  }
                  placeholder="Escribe un modelo y pulsa Enter..."
                />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <KeyRound size={14} />
                  API key write-only
                </Label>
                <Input
                  type="password"
                  value={secretInputs[providerId] ?? ""}
                  onChange={(event) =>
                    setSecretInputs((current) => ({
                      ...current,
                      [providerId]: event.target.value,
                    }))
                  }
                  placeholder={
                    secretStatus.isConfigured
                      ? "Deja vacío para conservar la key actual"
                      : "Pega una API key para este proveedor"
                  }
                />
              </div>
            </div>
          );
        })}
      </section>

      <div className="rounded-2xl border border-border/50 bg-surface p-6">
        <p className="text-sm text-foreground/70">
          Los miembros del workspace podrán consumir esta configuración desde previews y generación
          de templates. Los secrets nunca vuelven al cliente en claro.
        </p>
        <p className="mt-2 text-sm text-foreground/70">
          Puedes volver a la sección general desde{" "}
          <Link href="/settings" className="font-medium text-primary">
            Configuración
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
