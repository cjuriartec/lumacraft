"use client";

import { useEffect, useMemo, useState } from "react";

import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { mapEagerRecordToTemplateRoot } from "../../application/services/template-runtime-context-mapper";
import { TemplateVariableCatalogNode } from "../types/template-variable-catalog";

export type VariableNode = TemplateVariableCatalogNode;

interface UseVariableFieldsOptions {
  collectionId?: string | null;
  recordId?: string | null;
  depth?: number;
}

interface ResolvedFieldMetadata {
  name: string;
  displayName: string;
  fieldType: FieldTypeValue;
  targetCollectionId: string | null;
  cardinality: VariableNode["cardinality"];
  enumOptions: string[];
}

function normalizeOptions(
  value: string | null | undefined | UseVariableFieldsOptions,
): UseVariableFieldsOptions {
  if (!value || typeof value === "string") {
    return {
      collectionId: value ?? null,
      depth: 2,
      recordId: null,
    };
  }

  return {
    collectionId: value.collectionId ?? null,
    recordId: value.recordId ?? null,
    depth: value.depth ?? 2,
  };
}

function readPath(root: Record<string, unknown> | null, path: string): unknown {
  if (!root) return undefined;

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function getCardinalityFromConfig(
  config: Record<string, unknown> | undefined,
): VariableNode["cardinality"] {
  const raw = config?.relationType;
  if (raw === "ONE_TO_ONE") return "ONE_TO_ONE";
  if (raw === "ONE_TO_MANY") return "ONE_TO_MANY";
  if (raw === "MANY_TO_ONE") return "MANY_TO_ONE";
  if (raw === "MANY_TO_MANY") return "MANY_TO_MANY";
  return null;
}

function normalizeEnumOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function fromDomainField(field: Field): ResolvedFieldMetadata {
  const config = field.config?.value;
  const targetCollectionId = config?.targetCollectionId;

  return {
    name: field.name,
    displayName: field.displayName || field.name,
    fieldType: field.fieldType.value,
    targetCollectionId: typeof targetCollectionId === "string" ? targetCollectionId : null,
    cardinality: getCardinalityFromConfig(config),
    enumOptions: normalizeEnumOptions(config?.options),
  };
}

export function useVariableFields(value?: string | null | UseVariableFieldsOptions) {
  const options = normalizeOptions(value);
  const { supabase } = useSupabase();
  const [nodes, setNodes] = useState<VariableNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectionFactory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listFieldsUseCase = useMemo(() => collectionFactory.listFields(), [collectionFactory]);
  const eagerLoadUseCase = useMemo(() => collectionFactory.eagerLoadRecord(), [collectionFactory]);
  const getCollectionUseCase = useMemo(
    () => collectionFactory.getCollection(),
    [collectionFactory],
  );

  useEffect(() => {
    const listFields = listFieldsUseCase;
    const eagerLoad = eagerLoadUseCase;

    const fetchFields = async (
      collectionId: string,
      metadataCache: Map<string, ResolvedFieldMetadata[]>,
      discoveredErrors: string[],
    ): Promise<ResolvedFieldMetadata[]> => {
      if (metadataCache.has(collectionId)) {
        return metadataCache.get(collectionId) ?? [];
      }

      const typedFields = await listFields.execute(collectionId);
      if (typedFields.ok) {
        const resolved = typedFields.value.map(fromDomainField);

        const reverseLookups = typedFields.value.filter(
          (f) => f.fieldType.value === "REVERSE_LOOKUP",
        );
        if (reverseLookups.length > 0) {
          const targetFieldIds = reverseLookups
            .map((f) => (f.config?.value as Record<string, unknown>)?.targetFieldId as string)
            .filter(Boolean);

          if (targetFieldIds.length > 0) {
            const { data } = await supabase
              .from("fields")
              .select("id, name, display_name, config")
              .in("id", targetFieldIds);

            if (data) {
              const configMap = new Map(
                data.map((d) => [
                  d.id,
                  {
                    config: d.config as Record<string, unknown>,
                    name: d.name,
                    displayName: d.display_name,
                  },
                ]),
              );
              for (const rField of resolved) {
                if (rField.fieldType === "REVERSE_LOOKUP") {
                  const originalField = typedFields.value.find((f) => f.name === rField.name);
                  const targetFieldId = (originalField?.config?.value as Record<string, unknown>)
                    ?.targetFieldId as string;

                  if (targetFieldId && configMap.has(targetFieldId)) {
                    const originalMeta = configMap.get(targetFieldId)!;
                    const originalConfig = originalMeta.config;
                    const originalRelationType = originalConfig?.relationType;

                    const originalName = originalMeta.displayName || originalMeta.name;
                    rField.displayName = `${rField.displayName} (${originalName})`;

                    if (originalRelationType === "ONE_TO_ONE") rField.cardinality = "ONE_TO_ONE";
                    else if (originalRelationType === "ONE_TO_MANY")
                      rField.cardinality = "MANY_TO_ONE";
                    else if (originalRelationType === "MANY_TO_ONE")
                      rField.cardinality = "ONE_TO_MANY";
                    else if (originalRelationType === "MANY_TO_MANY")
                      rField.cardinality = "MANY_TO_MANY";
                  }
                }
              }
            }
          }
        }

        metadataCache.set(collectionId, resolved);
        return resolved;
      }

      discoveredErrors.push(typedFields.error.message);
      metadataCache.set(collectionId, []);
      return [];
    };

    const fetchCollectionMeta = async (
      collectionId: string,
      collectionMetaCache: Map<string, { name: string; description?: string }>,
      discoveredErrors: string[],
    ): Promise<{ name: string; description?: string } | null> => {
      if (collectionMetaCache.has(collectionId)) {
        return collectionMetaCache.get(collectionId) ?? null;
      }

      const result = await getCollectionUseCase.execute(collectionId);
      if (!result.ok) {
        discoveredErrors.push(result.error.message);
        return null;
      }

      if (!result.value) {
        return null;
      }

      const meta = {
        name: result.value.displayName || result.value.name,
        description: result.value.description,
      };
      collectionMetaCache.set(collectionId, meta);
      return meta;
    };

    const resolveNodes = async (
      targetCollectionId: string,
      currentPath: string,
      currentDepth: number,
      sampleRoot: Record<string, unknown> | null,
      metadataCache: Map<string, ResolvedFieldMetadata[]>,
      collectionMetaCache: Map<string, { name: string; description?: string }>,
      discoveredErrors: string[],
      fieldNamesPath: string[] = [],
    ): Promise<VariableNode[]> => {
      if (currentDepth >= 7) return [];

      const fields = await fetchFields(targetCollectionId, metadataCache, discoveredErrors);
      const collectionMeta = await fetchCollectionMeta(
        targetCollectionId,
        collectionMetaCache,
        discoveredErrors,
      );

      const fieldNodes: VariableNode[] = [];

      for (const field of fields) {
        const fieldPath = currentPath ? `${currentPath}.${field.name}` : field.name;
        let finalDisplayName = field.displayName;
        if (field.fieldType === "REVERSE_LOOKUP" && fieldNamesPath.length > 0) {
          const joinedPath = fieldNamesPath.join(" → ");
          finalDisplayName = `${field.displayName} [${joinedPath}]`;
        }

        const node: VariableNode = {
          path: fieldPath,
          displayName: finalDisplayName,
          fieldType: field.fieldType,
          collectionId: targetCollectionId,
          collectionName: collectionMeta?.name,
          collectionDescription: collectionMeta?.description,
          cardinality: field.cardinality,
          enumOptions: field.enumOptions,
          sampleValue: readPath(sampleRoot, fieldPath),
        };

        if (
          (field.fieldType === "RELATION" || field.fieldType === "REVERSE_LOOKUP") &&
          field.targetCollectionId
        ) {
          if (currentDepth < 4) {
            const nextFieldNamesPath = [...fieldNamesPath, field.displayName];
            const children = await resolveNodes(
              field.targetCollectionId,
              fieldPath,
              currentDepth + 1,
              sampleRoot,
              metadataCache,
              collectionMetaCache,
              discoveredErrors,
              nextFieldNamesPath,
            );

            if (children.length > 0) {
              node.children = children;
            }
          }
        }

        fieldNodes.push(node);
      }

      return fieldNodes;
    };

    let ignore = false;
    const load = async () => {
      if (!options.collectionId) {
        setNodes([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const discoveredErrors: string[] = [];
      let sampleRoot: Record<string, unknown> | null = null;

      if (options.recordId) {
        const eagerResult = await eagerLoad.execute({
          collectionId: options.collectionId,
          recordId: options.recordId,
          depth: options.depth,
        });

        if (eagerResult.ok) {
          sampleRoot = mapEagerRecordToTemplateRoot(eagerResult.value);
        } else {
          discoveredErrors.push(eagerResult.error.message);
        }
      }

      const resolvedNodes = await resolveNodes(
        options.collectionId,
        "",
        0,
        sampleRoot,
        new Map<string, ResolvedFieldMetadata[]>(),
        new Map<string, { name: string; description?: string }>(),
        discoveredErrors,
        [],
      );

      if (ignore) return;

      setNodes(resolvedNodes);
      setLoading(false);
      setError(discoveredErrors.length > 0 ? discoveredErrors[0] : null);
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [
    eagerLoadUseCase,
    getCollectionUseCase,
    listFieldsUseCase,
    options.collectionId,
    options.depth,
    options.recordId,
    supabase,
  ]);

  return {
    nodes,
    loading,
    error,
  };
}
