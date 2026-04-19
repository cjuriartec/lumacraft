import {
  getValueAtTemplatePath,
  projectTemplateContextByPaths,
} from "@/modules/template/application/services/template-context-projection";
import { interpolateTemplateString } from "@/modules/template/application/services/template-path-resolver";
import { TemplateRuntimeFieldMetadata } from "@/modules/template/domain/types/template-runtime-context";

import { ACCOUNT_AI_INTERNAL_BASE_PROMPT } from "./account-ai-system-prompt";

const EXPLICIT_CONTEXT_MAX_CHARS = 4_000;
const METADATA_MAX_CHARS = 2_000;
const MINIMAL_SUMMARY_MAX_CHARS = 1_500;
const FIELD_VALUE_MAX_CHARS = 300;
const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.\[\]-]+)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPromptPaths(promptTemplate: string): string[] {
  const uniquePaths = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(promptTemplate)) !== null) {
    const path = match[1]?.trim();
    if (!path) continue;
    uniquePaths.add(path);
  }

  TOKEN_REGEX.lastIndex = 0;
  return Array.from(uniquePaths);
}

export type PromptGroundingMode = "explicit_paths" | "minimal_summary" | "full_root";

function resolveGroundingMode(paths: string[]): PromptGroundingMode {
  if (paths.length === 0) {
    return "minimal_summary";
  }

  if (
    paths.some((path) => {
      const normalizedPath = path.trim();
      return !normalizedPath || normalizedPath === "root" || normalizedPath === "record";
    })
  ) {
    return "full_root";
  }

  return "explicit_paths";
}

function inferFieldType(value: unknown): string {
  if (value === null || value === undefined) return "UNKNOWN";
  if (Array.isArray(value)) return "ARRAY";

  switch (typeof value) {
    case "string":
      return "TEXT";
    case "number":
      return "NUMBER";
    case "boolean":
      return "BOOLEAN";
    case "object": {
      if (!isRecord(value)) return "OBJECT";

      const mimeType = value.mimeType;
      if (typeof mimeType === "string") {
        return mimeType.startsWith("image/") ? "IMAGE" : "FILE";
      }

      return "OBJECT";
    }
    default:
      return "UNKNOWN";
  }
}

function toFieldLabel(path: string): string {
  const segments = path.split(".");
  return segments[segments.length - 1] ?? path;
}

function buildFieldMetadataSnapshot(
  context: Record<string, unknown>,
  usedPaths: string[],
  fieldMetadataByPath: Record<string, TemplateRuntimeFieldMetadata> | undefined,
) {
  return usedPaths.map((path) => {
    const metadata = fieldMetadataByPath?.[path];
    const value = getValueAtTemplatePath(context, path);
    return {
      path,
      displayName: metadata?.displayName ?? toFieldLabel(path),
      description: metadata?.description ?? null,
      fieldType: metadata?.fieldType ?? inferFieldType(value),
      enumOptions: metadata?.enumOptions ?? [],
      relationType: metadata?.relationType ?? null,
      collectionId: metadata?.collectionId ?? null,
      isRequired: metadata?.isRequired ?? null,
      isUnique: metadata?.isUnique ?? null,
    };
  });
}

function clampSnapshot(raw: string, maxChars: number): { text: string; truncated: boolean } {
  if (raw.length <= maxChars) {
    return { text: raw, truncated: false };
  }

  return {
    text: `${raw.slice(0, maxChars)}\n... [TRUNCATED]`,
    truncated: true,
  };
}

function stringifyPrimitiveValue(value: string | number | boolean) {
  const raw = String(value);
  if (raw.length <= FIELD_VALUE_MAX_CHARS) {
    return { value: raw, truncated: false };
  }

  return {
    value: `${raw.slice(0, FIELD_VALUE_MAX_CHARS)}...`,
    truncated: true,
  };
}

function buildMinimalContextSummary(context: Record<string, unknown>) {
  const summary: Record<string, string | number | boolean> = {};
  let truncated = false;

  for (const [key, value] of Object.entries(context)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }

    const serialized = stringifyPrimitiveValue(value);
    summary[key] = typeof value === "string" ? serialized.value : value;
    truncated ||= serialized.truncated;
  }

  if (Object.keys(summary).length === 0) {
    summary._note = "No primitive top-level fields available.";
  }

  return {
    summary,
    truncated,
  };
}

export interface CollectionContextInput {
  id: string;
  name: string;
  description?: string;
}

export interface BuildPromptInput {
  promptTemplate: string;
  context: Record<string, unknown>;
  locals?: Record<string, unknown>;
  mode?: PromptGroundingMode;
  systemInstruction?: string;
  fieldMetadataByPath?: Record<string, TemplateRuntimeFieldMetadata>;
  collectionContext?: CollectionContextInput | null;
}

export interface BuildPromptOutput {
  prompt: string;
  contextSnapshot: string;
  metadataSnapshot: string;
  usedPaths: string[];
  truncated: boolean;
  mode: PromptGroundingMode;
}

export function buildGroundedPrompt(input: BuildPromptInput): BuildPromptOutput {
  const mergedContext: Record<string, unknown> = {
    ...input.context,
    ...(input.locals ?? {}),
  };

  const usedPaths = extractPromptPaths(input.promptTemplate);
  const mode = input.mode ?? resolveGroundingMode(usedPaths);
  let contextSnapshot = "";
  let metadataSnapshot = "";
  let truncated = false;

  if (mode === "minimal_summary") {
    const summaryResult = buildMinimalContextSummary(input.context);
    const serializedSummary = JSON.stringify(summaryResult.summary, null, 2);
    const clampedSummary = clampSnapshot(serializedSummary, MINIMAL_SUMMARY_MAX_CHARS);
    contextSnapshot = clampedSummary.text;
    truncated = summaryResult.truncated || clampedSummary.truncated;
  } else {
    const contextPaths = mode === "full_root" ? ["root"] : usedPaths;
    const projectedContext = projectTemplateContextByPaths(mergedContext, contextPaths);
    const serializedContext = JSON.stringify(projectedContext, null, 2);
    const contextClamped = clampSnapshot(serializedContext, EXPLICIT_CONTEXT_MAX_CHARS);
    contextSnapshot = contextClamped.text;
    truncated ||= contextClamped.truncated;

    if (mode === "explicit_paths") {
      const metadata = buildFieldMetadataSnapshot(
        mergedContext,
        usedPaths,
        input.fieldMetadataByPath,
      );
      const serializedMetadata = JSON.stringify(metadata, null, 2);
      const metadataClamped = clampSnapshot(serializedMetadata, METADATA_MAX_CHARS);
      metadataSnapshot = metadataClamped.text;
      truncated ||= metadataClamped.truncated;
    }
  }

  const renderedPrompt = interpolateTemplateString(input.promptTemplate, {
    root: input.context,
    locals: input.locals ?? {},
  });

  const systemInstruction = input.systemInstruction ?? ACCOUNT_AI_INTERNAL_BASE_PROMPT;

  const promptSections = ["# System", systemInstruction, ""];

  if (input.collectionContext) {
    const collectionParts = [`# Collection Context`, `Name: ${input.collectionContext.name}`];
    if (input.collectionContext.description?.trim()) {
      collectionParts.push(`Description: ${input.collectionContext.description.trim()}`);
    }
    collectionParts.push(`ID: ${input.collectionContext.id}`);
    promptSections.push(...collectionParts, "");
  }

  promptSections.push(
    mode === "minimal_summary" ? "# Context Summary" : "# Context",
    contextSnapshot,
    "",
  );

  if (metadataSnapshot.trim()) {
    promptSections.push("# Field Metadata", metadataSnapshot, "");
  }

  promptSections.push("# User Prompt", renderedPrompt);

  const prompt = promptSections.join("\n");

  return {
    prompt,
    contextSnapshot,
    metadataSnapshot,
    usedPaths,
    truncated,
    mode,
  };
}
