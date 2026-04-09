import { TemplateRuntimeScope } from "../../domain/types/template-runtime-context";

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.\[\]-]+)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitPath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function readPath(root: unknown, path: string): unknown {
  const segments = splitPath(path);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isInteger(index)) {
        current = current[index];
        continue;
      }

      current = current
        .map((item) => (isRecord(item) ? item[segment] : undefined))
        .filter((item) => item !== undefined);
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^\$\./, "")
    .replace(/^root\./, "")
    .replace(/^record\./, "");
}

export function resolveTemplatePath(scope: TemplateRuntimeScope, rawPath: string): unknown {
  const path = normalizePath(rawPath);
  if (!path || path === "root" || path === "record") {
    return scope.root;
  }

  const rootKey = splitPath(path)[0];
  if (rootKey && rootKey in scope.locals) {
    return readPath(scope.locals, path);
  }

  return readPath(scope.root, path);
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isRecord(value)) return Object.keys(value).length === 0;
  return false;
}

export function stringifyTemplateValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "";

    const primitiveValues = value.filter(
      (item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );

    if (primitiveValues.length === value.length) {
      return primitiveValues.map(String).join(", ");
    }

    const imageValues = value
      .map((item) => {
        if (!isRecord(item)) return null;

        const maybePath = item.path;
        const maybeName = item.name;
        const maybeMime = item.mimeType;

        if (
          typeof maybePath === "string" &&
          typeof maybeName === "string" &&
          typeof maybeMime === "string" &&
          maybeMime.startsWith("image/")
        ) {
          return `![${maybeName}](${maybePath})`;
        }

        return null;
      })
      .filter((item): item is string => item !== null);

    if (imageValues.length === value.length) {
      return imageValues.join("\n");
    }
  }

  if (isRecord(value)) {
    const maybePath = value.path;
    const maybeName = value.name;
    const maybeMime = value.mimeType;
    if (
      typeof maybePath === "string" &&
      typeof maybeName === "string" &&
      typeof maybeMime === "string" &&
      maybeMime.startsWith("image/")
    ) {
      return `![${maybeName}](${maybePath})`;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function interpolateTemplateString(template: string, scope: TemplateRuntimeScope): string {
  return template.replace(TOKEN_REGEX, (_match, path: string) => {
    const value = resolveTemplatePath(scope, path);
    return stringifyTemplateValue(value);
  });
}

/**
 * Applies text transformation to a string.
 * Used for variables formatting in both preview and PDF export.
 */
export function applyTextTransform(text: string, transform?: string): string {
  if (!text || !transform || transform === "none") return text;

  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize": // Used as "Sentence case" in Lumacraft
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    default:
      return text;
  }
}
