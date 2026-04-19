import { EagerLoadRecordUseCase } from "@/modules/collection/application/use-cases/eager-load-record.use-case";
import { GetCollectionUseCase } from "@/modules/collection/application/use-cases/get-collection.use-case";
import { ListFieldsUseCase } from "@/modules/collection/application/use-cases/list-fields.use-case";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { TemplateRuntimeContextResolverPort } from "../../application/ports/template-runtime-context-resolver.port";
import {
  projectTemplateContextByPaths,
  projectTemplateContextWithTopLevelPrimitives,
} from "../../application/services/template-context-projection";
import { resolveTemplateDependencyPlan } from "../../application/services/template-dependency-plan-resolver";
import { mapEagerRecordToTemplateRoot } from "../../application/services/template-runtime-context-mapper";
import {
  ResolvedTemplateDependencyPlan,
  TemplateDependencyFieldDescriptor,
  TemplateDependencyPlan,
} from "../../application/types/template-dependency-plan";
import {
  TemplateRuntimeContext,
  TemplateRuntimeFieldMetadata,
} from "../../domain/types/template-runtime-context";

interface MetadataResolveParams {
  collectionId: string;
  prefix: string;
  depth: number;
  cache: Map<string, Field[]>;
  visitedCollections: Set<string>;
  referencedPaths?: string[];
}

function isRelevantPath(path: string, referencedPaths?: string[]): boolean {
  if (!referencedPaths || referencedPaths.length === 0) {
    return true;
  }

  return referencedPaths.some(
    (referencedPath) => referencedPath === path || referencedPath.startsWith(`${path}.`),
  );
}

function hasNestedRelevantPath(path: string, referencedPaths?: string[]): boolean {
  if (!referencedPaths || referencedPaths.length === 0) {
    return true;
  }

  return referencedPaths.some((referencedPath) => referencedPath.startsWith(`${path}.`));
}

function getTopLevelRelationFields(paths?: string[]): string[] | undefined {
  if (!paths || paths.length === 0) {
    return undefined;
  }

  const fields = Array.from(
    new Set(
      paths
        .map((path) => path.split(".")[0]?.trim())
        .filter(
          (fieldName): fieldName is string => typeof fieldName === "string" && fieldName.length > 0,
        ),
    ),
  );

  return fields.length > 0 ? fields : undefined;
}

function toDependencyFieldDescriptor(field: Field): TemplateDependencyFieldDescriptor {
  const targetCollectionId = field.config?.value?.targetCollectionId;

  return {
    name: field.name,
    fieldType: field.fieldType.value,
    targetCollectionId: typeof targetCollectionId === "string" ? targetCollectionId : null,
  };
}

function buildFallbackResolvedPlan(
  dependencyPlan: TemplateDependencyPlan | undefined,
  requestedDepth: number | undefined,
): ResolvedTemplateDependencyPlan {
  return {
    blockMetadata: dependencyPlan?.blockMetadata ?? [],
    referencedPaths: dependencyPlan?.referencedPaths ?? [],
    relationPaths: dependencyPlan?.relationPaths ?? [],
    aiBlocks: dependencyPlan?.aiBlocks ?? [],
    imagePaths: dependencyPlan?.imagePaths ?? [],
    depth: dependencyPlan?.depth ?? Math.max(0, Math.min(requestedDepth ?? 2, 5)),
    eagerDepth: Math.max(0, Math.min(requestedDepth ?? 2, 5)),
    runtimeProjectionPaths: [],
    fieldMetadataPaths: [],
    requiresFieldMetadata: false,
    requiresCollectionContext: false,
    requiresMinimalSummary: false,
    requiresFullRoot: true,
    includeAllRelationPaths: true,
  };
}

export class EagerLoadTemplateContextResolverAdapter implements TemplateRuntimeContextResolverPort {
  constructor(
    private readonly eagerLoadRecordUseCase: EagerLoadRecordUseCase,
    private readonly listFieldsUseCase: ListFieldsUseCase,
    private readonly getCollectionUseCase: GetCollectionUseCase,
  ) {}

  private getFieldEnumOptions(field: Field): string[] {
    const options = field.config?.value?.options;
    if (!Array.isArray(options)) return [];

    return options.filter((option): option is string => typeof option === "string");
  }

  private getFieldRelationType(field: Field): string | null {
    const relationType = field.config?.value?.relationType;
    return typeof relationType === "string" ? relationType : null;
  }

  private getFieldTargetCollectionId(field: Field): string | null {
    const targetCollectionId = field.config?.value?.targetCollectionId;
    return typeof targetCollectionId === "string" ? targetCollectionId : null;
  }

  private async getFieldsByCollection(
    collectionId: string,
    cache: Map<string, Field[]>,
  ): Promise<Result<Field[]>> {
    if (cache.has(collectionId)) {
      return ok(cache.get(collectionId) ?? []);
    }

    const result = await this.listFieldsUseCase.execute(collectionId);
    if (!result.ok) {
      return fail(result.error);
    }

    cache.set(collectionId, result.value);
    return ok(result.value);
  }

  private async resolveFieldMetadata(
    params: MetadataResolveParams,
  ): Promise<Record<string, TemplateRuntimeFieldMetadata>> {
    if (params.depth < 0) return {};

    const fieldsResult = await this.getFieldsByCollection(params.collectionId, params.cache);
    if (!fieldsResult.ok) {
      return {};
    }

    const metadataByPath: Record<string, TemplateRuntimeFieldMetadata> = {};

    const nestedMetadata = await Promise.all(
      fieldsResult.value.map(async (field) => {
        const path = params.prefix ? `${params.prefix}.${field.name}` : field.name;
        if (!isRelevantPath(path, params.referencedPaths)) {
          return {};
        }

        const metadata: Record<string, TemplateRuntimeFieldMetadata> = {
          [path]: {
            path,
            displayName: field.displayName || field.name,
            description: field.description,
            fieldType: field.fieldType.value,
            enumOptions: this.getFieldEnumOptions(field),
            collectionId: params.collectionId,
            relationType: this.getFieldRelationType(field),
            isRequired: field.isRequired,
            isUnique: field.isUnique,
          },
        };

        if (field.fieldType.value !== "RELATION") {
          return metadata;
        }

        const targetCollectionId = this.getFieldTargetCollectionId(field);
        if (!targetCollectionId || params.visitedCollections.has(targetCollectionId)) {
          return metadata;
        }

        if (!hasNestedRelevantPath(path, params.referencedPaths) || params.depth <= 0) {
          return metadata;
        }

        const nextVisited = new Set(params.visitedCollections);
        nextVisited.add(targetCollectionId);
        const relationMetadata = await this.resolveFieldMetadata({
          collectionId: targetCollectionId,
          prefix: path,
          depth: params.depth - 1,
          cache: params.cache,
          visitedCollections: nextVisited,
          referencedPaths: params.referencedPaths,
        });

        return {
          ...metadata,
          ...relationMetadata,
        };
      }),
    );

    for (const entry of nestedMetadata) {
      Object.assign(metadataByPath, entry);
    }

    return metadataByPath;
  }

  public async resolve(params: {
    collectionId: string;
    recordId: string;
    depth?: number;
    dependencyPlan?: TemplateDependencyPlan;
  }): Promise<Result<TemplateRuntimeContext>> {
    const fallbackPlan = buildFallbackResolvedPlan(params.dependencyPlan, params.depth);
    const dependencyFieldCache = new Map<string, Field[]>();
    const resolvedPlanResult = params.dependencyPlan
      ? await resolveTemplateDependencyPlan({
          collectionId: params.collectionId,
          dependencyPlan: params.dependencyPlan,
          loadFields: async (collectionId) => {
            const fieldsResult = await this.getFieldsByCollection(
              collectionId,
              dependencyFieldCache,
            );
            if (!fieldsResult.ok) {
              return fail(fieldsResult.error);
            }

            return ok(fieldsResult.value.map(toDependencyFieldDescriptor));
          },
        })
      : ok(fallbackPlan);

    if (!resolvedPlanResult.ok) {
      return fail(new DomainError(resolvedPlanResult.error.message, "TEMPLATE_CONTEXT_NOT_FOUND"));
    }

    const resolvedPlan = resolvedPlanResult.value;
    const resolvedDepth = Math.max(0, Math.min(params.depth ?? resolvedPlan.eagerDepth, 5));
    const includeRelationPaths = resolvedPlan.includeAllRelationPaths
      ? undefined
      : resolvedPlan.relationPaths;

    const collectionPromise = resolvedPlan.requiresCollectionContext
      ? this.getCollectionUseCase.execute(params.collectionId)
      : Promise.resolve(ok(null));
    const [collectionResult, eagerResult] = await Promise.all([
      collectionPromise,
      this.eagerLoadRecordUseCase.execute({
        collectionId: params.collectionId,
        recordId: params.recordId,
        depth: resolvedDepth,
        includeFields: getTopLevelRelationFields(includeRelationPaths),
        includeRelationPaths,
      }),
    ]);

    if (!collectionResult.ok) {
      return fail(new DomainError(collectionResult.error.message, "TEMPLATE_CONTEXT_NOT_FOUND"));
    }

    if (!eagerResult.ok) {
      return fail(new DomainError(eagerResult.error.message, "TEMPLATE_CONTEXT_NOT_FOUND"));
    }

    const root = mapEagerRecordToTemplateRoot(eagerResult.value);
    const projectedRoot = resolvedPlan.requiresFullRoot
      ? root
      : resolvedPlan.requiresMinimalSummary
        ? projectTemplateContextWithTopLevelPrimitives(root, resolvedPlan.runtimeProjectionPaths)
        : projectTemplateContextByPaths(root, resolvedPlan.runtimeProjectionPaths);
    const fieldMetadataByPath = resolvedPlan.requiresFieldMetadata
      ? await this.resolveFieldMetadata({
          collectionId: params.collectionId,
          prefix: "",
          depth: resolvedDepth,
          cache: new Map<string, Field[]>(),
          visitedCollections: new Set<string>([params.collectionId]),
          referencedPaths: resolvedPlan.fieldMetadataPaths,
        })
      : undefined;

    console.info(
      JSON.stringify({
        level: "info",
        collectionId: params.collectionId,
        recordId: params.recordId,
        dependencyDepth: resolvedDepth,
        referencedPathCount: resolvedPlan.referencedPaths.length,
        projectionPathCount: resolvedPlan.runtimeProjectionPaths.length,
        requiresFullRoot: resolvedPlan.requiresFullRoot,
      }),
    );

    return ok({
      recordId: eagerResult.value.id,
      collectionId: eagerResult.value.collectionId,
      collectionName: eagerResult.value.collectionName,
      collectionDescription: resolvedPlan.requiresCollectionContext
        ? (collectionResult.value?.description ?? null)
        : null,
      root: projectedRoot,
      fieldMetadataByPath,
    });
  }
}
