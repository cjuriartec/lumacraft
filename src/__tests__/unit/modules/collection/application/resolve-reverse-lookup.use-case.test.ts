import { describe, expect, it } from "vitest";

import { makeField, makeRecord } from "@/__tests__/factories/domain-factories";
import { InMemoryFieldRepository, InMemoryRecordRepository } from "@/__tests__/helpers/fakes";
import { ResolveReverseLookupUseCase } from "@/modules/collection/application/use-cases/resolve-reverse-lookup.use-case";

describe("ResolveReverseLookupUseCase", () => {
  it("resolves reverse relations in bulk correctly", async () => {
    // 1. Setup
    const office1Id = "office-1";
    const office2Id = "office-2";

    const relationField = makeField({
      id: "field-relation-id",
      name: "oficina",
      collectionId: "personal-collection",
    });

    const fieldRepository = new InMemoryFieldRepository([relationField]);
    const recordRepository = new InMemoryRecordRepository();

    // Create workers linked to offices
    const worker1 = makeRecord({
      id: "worker-1",
      collectionId: "personal-collection",
      data: { oficina: office1Id, nombre: "Worker 1" },
    });
    const worker2 = makeRecord({
      id: "worker-2",
      collectionId: "personal-collection",
      data: { oficina: office1Id, nombre: "Worker 2" },
    });
    const worker3 = makeRecord({
      id: "worker-3",
      collectionId: "personal-collection",
      data: { oficina: office2Id, nombre: "Worker 3" },
    });

    await recordRepository.create(worker1);
    await recordRepository.create(worker2);
    await recordRepository.create(worker3);

    const useCase = new ResolveReverseLookupUseCase(fieldRepository, recordRepository);

    // 2. Execute
    const result = await useCase.execute({
      targetFieldId: relationField.id,
      targetCollectionId: "personal-collection",
      sourceRecordIds: [office1Id, office2Id, "office-3"],
    });

    // 3. Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[office1Id]).toHaveLength(2);
      expect(result.value[office1Id].map((r) => r.id)).toContain("worker-1");
      expect(result.value[office1Id].map((r) => r.id)).toContain("worker-2");

      expect(result.value[office2Id]).toHaveLength(1);
      expect(result.value[office2Id][0].id).toBe("worker-3");

      expect(result.value["office-3"]).toHaveLength(0);
    }
  });
});
