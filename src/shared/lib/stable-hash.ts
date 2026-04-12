import { createHash } from "crypto";

function normalizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const sortedKeys = Object.keys(value).sort();
  const normalized: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    normalized[key] = normalizeForStableStringify(value[key]);
  }

  return normalized;
}

function normalizeForStableStringify(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableStringify(item));
  }

  if (value && typeof value === "object") {
    return normalizeObject(value as Record<string, unknown>);
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableStringify(value));
}

export function hashStableValue(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
