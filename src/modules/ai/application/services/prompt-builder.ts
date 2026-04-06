import { interpolateTemplateString } from "@/modules/template/application/services/template-path-resolver";
import { TemplateRuntimeFieldMetadata } from "@/modules/template/domain/types/template-runtime-context";

import { ACCOUNT_AI_INTERNAL_BASE_PROMPT } from "./account-ai-system-prompt";

const DEFAULT_MAX_CONTEXT_CHARS = 10_000;
const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.\[\]-]+)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getPathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getValueAtPath(root: Record<string, unknown>, path: string): unknown {
  const normalizedPath = path.trim();
  if (!normalizedPath || normalizedPath === "root" || normalizedPath === "record") {
    return root;
  }

  const segments = getPathSegments(normalizedPath);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    if (!isRecord(current)) return undefined;
    current = current[segment];
  }

  return current;
}

function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = getPathSegments(path);
  if (!segments.length) return;

  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const existing = cursor[segment];

    if (!isRecord(existing)) {
      const next: Record<string, unknown> = {};
      cursor[segment] = next;
      cursor = next;
      continue;
    }

    cursor = existing;
  }

  cursor[segments[segments.length - 1]] = value;
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

function projectContextByPaths(
  context: Record<string, unknown>,
  paths: string[],
): Record<string, unknown> {
  if (paths.length === 0) {
    return cloneJsonValue(context);
  }

  if (
    paths.some((path) => {
      const normalizedPath = path.trim();
      return !normalizedPath || normalizedPath === "root" || normalizedPath === "record";
    })
  ) {
    return cloneJsonValue(context);
  }

  const projected: Record<string, unknown> = {};
  for (const path of paths) {
    const value = getValueAtPath(context, path);
    if (value !== undefined) {
      setValueAtPath(projected, path, cloneJsonValue(value));
    }
  }
  return projected;
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
    const value = getValueAtPath(context, path);
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

export interface CollectionContextInput {
  id: string;
  name: string;
  description?: string;
}

export interface BuildPromptInput {
  promptTemplate: string;
  context: Record<string, unknown>;
  locals?: Record<string, unknown>;
  maxContextChars?: number;
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
}

export function buildGroundedPrompt(input: BuildPromptInput): BuildPromptOutput {
  const mergedContext: Record<string, unknown> = {
    ...input.context,
    ...(input.locals ?? {}),
  };

  const usedPaths = extractPromptPaths(input.promptTemplate);
  // Always include root context so AI has full record data
  const contextPaths =
    usedPaths.length > 0
      ? usedPaths.includes("root")
        ? usedPaths
        : ["root", ...usedPaths]
      : ["root"];
  const projectedContext = projectContextByPaths(mergedContext, contextPaths);
  const metadata = buildFieldMetadataSnapshot(
    mergedContext,
    contextPaths,
    input.fieldMetadataByPath,
  );

  const maxContextChars = Math.max(512, input.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS);
  const serializedContext = JSON.stringify(projectedContext, null, 2);
  const serializedMetadata = JSON.stringify(metadata, null, 2);
  const contextClamped = clampSnapshot(serializedContext, maxContextChars);
  const metadataClamped = clampSnapshot(serializedMetadata, maxContextChars);

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
    "# Context (Variables Referenciadas)",
    contextClamped.text,
    "",
    "# Field Metadata (Variables Referenciadas)",
    metadataClamped.text,
    "",
    "# User Prompt",
    renderedPrompt,
  );

  const prompt = promptSections.join("\n");

  return {
    prompt,
    contextSnapshot: contextClamped.text,
    metadataSnapshot: metadataClamped.text,
    usedPaths,
    truncated: contextClamped.truncated || metadataClamped.truncated,
  };
}
