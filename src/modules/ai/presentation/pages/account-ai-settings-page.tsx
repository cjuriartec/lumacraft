"use client";

import { BrainCircuit, KeyRound, RotateCw, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const { settings, loading, saving, error, save } = useAccountAISettings(currentWorkspace?.id);

  const [draft, setDraft] = useState<UpdateAccountAISettingsDto | null>(null);
  const [secretInputs, setSecretInputs] = useState<Partial<Record<AIProviderId, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const canEdit = isOwner || isSuperAdmin;
  const currentProviderModels = useMemo(() => {
    if (!draft) return [];
    return draft.providerOptions[draft.defaultProvider]?.allowedModels ?? [];
  }, [draft]);

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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
              Configuración de IA
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/70">
              Gestiona proveedor, modelos, timeouts, flags y secrets cifrados para{" "}
              <strong>{currentWorkspace.name}</strong>. Gemini queda activo hoy; OpenAI y Anthropic
              pueden dejarse preparados para adapters futuros.
            </p>
          </div>
          <Button
            type="button"
            onClick={async () => {
              const payload = normalizeDraftModel({
                ...draft,
                providerSecretsInput: secretInputs,
              });

              await save(payload);
              setSecretInputs({});
              setSuccessMessage("Configuración guardada");
              window.setTimeout(() => setSuccessMessage(null), 2500);
            }}
            disabled={saving}
            className="h-10 rounded-xl px-5"
          >
            {saving ? <RotateCw className="animate-spin" size={16} /> : <Save size={16} />}
            Guardar
          </Button>
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
                <div className="text-right text-xs text-foreground/60">
                  <p>{secretStatus.isConfigured ? "Configurado" : "Sin configurar"}</p>
                  {secretStatus.last4 && <p>Terminada en {secretStatus.last4}</p>}
                  {secretStatus.updatedAt && (
                    <p>Actualizada {new Date(secretStatus.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>

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
