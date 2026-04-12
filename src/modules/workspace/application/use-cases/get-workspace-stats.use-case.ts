import { ICollectionRepository } from "@/modules/collection/domain/ports/collection-repository.port";
import { IRecordRepository } from "@/modules/collection/domain/ports/record-repository.port";
import { ITemplateRepository } from "@/modules/template/domain/ports/template-repository.port";
import { ok, Result } from "@/shared/domain/result";

export interface WorkspaceStats {
  collectionsCount: number;
  recordsCount: number;
  templatesCount: number;
}

export class GetWorkspaceStatsUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly recordRepository: IRecordRepository,
    private readonly templateRepository: ITemplateRepository,
  ) {}

  async execute(accountId: string): Promise<Result<WorkspaceStats>> {
    const [collectionsRes, recordsRes, templatesRes] = await Promise.all([
      this.collectionRepository.count(accountId),
      this.recordRepository.countAll(accountId),
      this.templateRepository.count(accountId),
    ]);

    // Accumulate errors if any, or just return the first error
    if (!collectionsRes.ok) return collectionsRes;
    if (!recordsRes.ok) return recordsRes;
    if (!templatesRes.ok) return templatesRes;

    return ok({
      collectionsCount: collectionsRes.value,
      recordsCount: recordsRes.value,
      templatesCount: templatesRes.value,
    });
  }
}
