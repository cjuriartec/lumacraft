import { Result } from "@/shared/domain/result";

import { IEagerLoadRepository } from "../../domain/ports/eager-load-repository.port";
import { EagerLoadedRecord, EagerLoadRequest } from "../../domain/types/eager-loading.types";

const MAX_DEPTH = 5;
const DEFAULT_DEPTH = 2;

export class EagerLoadRecordUseCase {
  constructor(private readonly repository: IEagerLoadRepository) {}

  async execute(request: EagerLoadRequest): Promise<Result<EagerLoadedRecord>> {
    const depth = Math.min(request.depth ?? DEFAULT_DEPTH, MAX_DEPTH);
    const visited = new Set<string>();

    return this.repository.resolveRecursive(
      request.recordId,
      request.collectionId,
      depth,
      visited,
      request.includeFields,
      request.includeRelationPaths,
    );
  }
}
