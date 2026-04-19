import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import {
  ResolvedTemplateDependencyPlan,
  TemplateDependencyFieldDescriptor,
  TemplateDependencyPlan,
} from "../types/template-dependency-plan";

const HARD_MAX_EAGER_DEPTH = 5;

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^\$\./, "")
    .replace(/^root\./, "")
    .replace(/^record\./, "");
}

function splitPath(path: string): string[] {
  return normalizePath(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getRelationConfigTargetCollectionId(
  field: TemplateDependencyFieldDescriptor | undefined,
): string | null {
  return typeof field?.targetCollectionId === "string" ? field.targetCollectionId : null;
}

function clampDepth(depth: number) {
  return Math.max(0, Math.min(HARD_MAX_EAGER_DEPTH, depth));
}

export async function resolveTemplateDependencyPlan(params: {
  collectionId: string;
  dependencyPlan: TemplateDependencyPlan;
  loadFields: (
    collectionId: string,
  ) => Promise<Result<TemplateDependencyFieldDescriptor[], DomainError>>;
}): Promise<Result<ResolvedTemplateDependencyPlan, DomainError>> {
  const fieldsCache = new Map<string, TemplateDependencyFieldDescriptor[]>();

  const getFields = async (
    collectionId: string,
  ): Promise<Result<TemplateDependencyFieldDescriptor[], DomainError>> => {
    if (fieldsCache.has(collectionId)) {
      return ok(fieldsCache.get(collectionId) ?? []);
    }

    const result = await params.loadFields(collectionId);
    if (!result.ok) {
      return fail(result.error);
    }

    fieldsCache.set(collectionId, result.value);
    return ok(result.value);
  };

  const relationPaths = new Set<string>();
  const runtimeProjectionPaths = new Set<string>();
  const fieldMetadataPaths = new Set<string>();
  let eagerDepth = 0;
  const requiresMinimalSummary = params.dependencyPlan.aiBlocks.some(
    (block) => block.contextMode === "minimal_summary",
  );
  const requiresFullRoot = params.dependencyPlan.aiBlocks.some(
    (block) => block.contextMode === "full_root",
  );

  const explicitPromptPaths = params.dependencyPlan.aiBlocks
    .filter((block) => block.contextMode === "explicit_paths")
    .flatMap((block) => block.promptPaths);

  for (const path of explicitPromptPaths) {
    const normalizedPath = normalizePath(path);
    if (normalizedPath.length > 0) {
      fieldMetadataPaths.add(normalizedPath);
    }
  }

  for (const rawPath of params.dependencyPlan.referencedPaths) {
    const normalizedPath = normalizePath(rawPath);
    if (!normalizedPath) {
      continue;
    }

    runtimeProjectionPaths.add(normalizedPath);

    if (requiresFullRoot) {
      continue;
    }

    const segments = splitPath(normalizedPath);
    if (segments.length === 0) {
      continue;
    }

    let currentCollectionId = params.collectionId;
    let currentPath = "";
    let currentRelationDepth = 0;

    for (const segment of segments) {
      const fieldsResult = await getFields(currentCollectionId);
      if (!fieldsResult.ok) {
        return fail(fieldsResult.error);
      }

      const field = fieldsResult.value.find((entry) => entry.name === segment);
      if (!field) {
        break;
      }

      currentPath = currentPath ? `${currentPath}.${segment}` : segment;

      if (field.fieldType !== "RELATION" && field.fieldType !== "REVERSE_LOOKUP") {
        break;
      }

      relationPaths.add(currentPath);
      currentRelationDepth += 1;
      eagerDepth = Math.max(eagerDepth, currentRelationDepth);

      const targetCollectionId = getRelationConfigTargetCollectionId(field);
      if (!targetCollectionId) {
        break;
      }

      currentCollectionId = targetCollectionId;
    }
  }

  const requiresFieldMetadata = fieldMetadataPaths.size > 0;
  const requiresCollectionContext = params.dependencyPlan.aiBlocks.length > 0;

  return ok({
    ...params.dependencyPlan,
    relationPaths: requiresFullRoot ? [] : Array.from(relationPaths).sort(),
    runtimeProjectionPaths: requiresFullRoot ? [] : Array.from(runtimeProjectionPaths).sort(),
    fieldMetadataPaths: Array.from(fieldMetadataPaths).sort(),
    eagerDepth: requiresFullRoot ? HARD_MAX_EAGER_DEPTH : clampDepth(eagerDepth),
    requiresFieldMetadata,
    requiresCollectionContext,
    requiresMinimalSummary,
    requiresFullRoot,
    includeAllRelationPaths: requiresFullRoot,
  });
}
