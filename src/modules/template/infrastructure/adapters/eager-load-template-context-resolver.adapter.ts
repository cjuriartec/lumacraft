import { EagerLoadRecordUseCase } from "@/modules/collection/application/use-cases/eager-load-record.use-case";
import { ListFieldsUseCase } from "@/modules/collection/application/use-cases/list-fields.use-case";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { TemplateRuntimeContextResolverPort } from "../../application/ports/template-runtime-context-resolver.port";
import { mapEagerRecordToTemplateRoot } from "../../application/services/template-runtime-context-mapper";
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
}

export class EagerLoadTemplateContextResolverAdapter implements TemplateRuntimeContextResolverPort {
  constructor(
    private readonly eagerLoadRecordUseCase: EagerLoadRecordUseCase,
    private readonly listFieldsUseCase: ListFieldsUseCase,
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
    if (params.depth <= 0) return {};

    const fieldsResult = await this.getFieldsByCollection(params.collectionId, params.cache);
    if (!fieldsResult.ok) {
      return {};
    }

    const metadataByPath: Record<string, TemplateRuntimeFieldMetadata> = {};

    for (const field of fieldsResult.value) {
      const path = params.prefix ? `${params.prefix}.${field.name}` : field.name;

      metadataByPath[path] = {
        path,
        displayName: field.displayName || field.name,
        description: field.description,
        fieldType: field.fieldType.value,
        enumOptions: this.getFieldEnumOptions(field),
        collectionId: params.collectionId,
        relationType: this.getFieldRelationType(field),
        isRequired: field.isRequired,
        isUnique: field.isUnique,
      };

      if (field.fieldType.value !== "RELATION") {
        continue;
      }

      const targetCollectionId = this.getFieldTargetCollectionId(field);
      if (!targetCollectionId) {
        continue;
      }

      if (params.visitedCollections.has(targetCollectionId)) {
        continue;
      }

      const nextVisited = new Set(params.visitedCollections);
      nextVisited.add(targetCollectionId);
      const nestedMetadata = await this.resolveFieldMetadata({
        collectionId: targetCollectionId,
        prefix: path,
        depth: params.depth - 1,
        cache: params.cache,
        visitedCollections: nextVisited,
      });

      Object.assign(metadataByPath, nestedMetadata);
    }

    return metadataByPath;
  }

  public async resolve(params: {
    collectionId: string;
    recordId: string;
    depth?: number;
  }): Promise<Result<TemplateRuntimeContext>> {
    const eagerResult = await this.eagerLoadRecordUseCase.execute({
      collectionId: params.collectionId,
      recordId: params.recordId,
      depth: params.depth,
    });

    if (!eagerResult.ok) {
      return fail(new DomainError(eagerResult.error.message, "TEMPLATE_CONTEXT_NOT_FOUND"));
    }

    const root = mapEagerRecordToTemplateRoot(eagerResult.value);
    const metadataDepth = Math.max(1, Math.min(params.depth ?? 2, 5));
    const fieldMetadataByPath = await this.resolveFieldMetadata({
      collectionId: params.collectionId,
      prefix: "",
      depth: metadataDepth,
      cache: new Map<string, Field[]>(),
      visitedCollections: new Set<string>([params.collectionId]),
    });

    return ok({
      recordId: eagerResult.value.id,
      collectionId: eagerResult.value.collectionId,
      collectionName: eagerResult.value.collectionName,
      root,
      fieldMetadataByPath,
    });
  }
}
