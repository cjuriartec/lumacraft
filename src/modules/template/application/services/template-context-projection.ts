function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeTemplatePath(path: string): string {
  return path
    .trim()
    .replace(/^\$\./, "")
    .replace(/^root\./, "")
    .replace(/^record\./, "");
}

export function splitTemplatePath(path: string): string[] {
  return normalizeTemplatePath(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getValueAtTemplatePath(root: Record<string, unknown>, path: string): unknown {
  const normalizedPath = path.trim();
  if (!normalizedPath || normalizedPath === "root" || normalizedPath === "record") {
    return root;
  }

  const segments = splitTemplatePath(normalizedPath);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

export function setValueAtTemplatePath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const segments = splitTemplatePath(path);
  if (!segments.length) {
    return;
  }

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

export function projectTemplateContextByPaths(
  context: Record<string, unknown>,
  paths: string[],
): Record<string, unknown> {
  if (paths.length === 0) {
    return {};
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
    const value = getValueAtTemplatePath(context, path);
    if (value !== undefined) {
      setValueAtTemplatePath(projected, path, cloneJsonValue(value));
    }
  }

  return projected;
}

export function projectTemplateContextWithTopLevelPrimitives(
  context: Record<string, unknown>,
  paths: string[],
): Record<string, unknown> {
  const projected = projectTemplateContextByPaths(context, paths);

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      projected[key] = cloneJsonValue(value);
    }
  }

  return projected;
}
