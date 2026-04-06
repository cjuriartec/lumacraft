import { Result } from "@/shared/domain/result";

import { IRecordRepository } from "../../domain/ports/record-repository.port";

export class DeleteRecordUseCase {
  constructor(private readonly recordRepository: IRecordRepository) {}

  async execute(id: string): Promise<Result<void>> {
    return this.recordRepository.delete(id);
  }
}
