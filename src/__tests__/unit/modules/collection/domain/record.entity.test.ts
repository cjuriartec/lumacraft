import { describe, expect, it } from "vitest";

import { makeField, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";

describe("DataRecord entity", () => {
  it("validates required fields", () => {
    resetFactories();
    const field = makeField({
      name: "title",
      displayName: "Title",
      isRequired: true,
    });
    const record = makeRecord({ data: {} });

    const result = record.validateAgainstSchema([field]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("REQUIRED_FIELD_MISSING");
    }
  });

  it("rejects invalid numbers", () => {
    resetFactories();
    const field = makeField({
      name: "budget",
      fieldType: "NUMBER",
    });
    const record = makeRecord({ data: { budget: "not-a-number" } });

    const result = record.validateAgainstSchema([field]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_TYPE");
    }
  });

  it("rejects invalid booleans", () => {
    resetFactories();
    const field = makeField({
      name: "active",
      fieldType: "BOOLEAN",
    });
    const record = makeRecord({ data: { active: "yes" } });

    const result = record.validateAgainstSchema([field]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_TYPE");
    }
  });

  it("rejects enum values outside the allowed list", () => {
    resetFactories();
    const field = makeField({
      name: "status",
      fieldType: "ENUM",
      config: { options: ["draft", "published"] },
    });
    const record = makeRecord({ data: { status: "archived" } });

    const result = record.validateAgainstSchema([field]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_ENUM_VALUE");
    }
  });

  it("rejects relation values that are not UUIDs", () => {
    resetFactories();
    const field = makeField({
      name: "client",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9",
        relationType: "ONE_TO_ONE",
        displayField: "name",
      },
    });
    const record = makeRecord({ data: { client: "not-uuid" } });

    const result = record.validateAgainstSchema([field]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_RELATION_VALUE");
    }
  });

  it("accepts valid file metadata and rejects malformed file values", () => {
    resetFactories();
    const field = makeField({
      name: "contract",
      fieldType: "FILE",
    });
    const validRecord = makeRecord({
      data: {
        contract: {
          bucket: "record_files",
          path: "workspace-1/collection-1/contract/file.pdf",
          name: "file.pdf",
          mimeType: "application/pdf",
          size: 100,
        },
      },
    });
    const invalidRecord = makeRecord({
      data: {
        contract: {
          path: "missing-bucket.pdf",
        },
      },
    });

    const validResult = validRecord.validateAgainstSchema([field]);
    const invalidResult = invalidRecord.validateAgainstSchema([field]);

    expect(validResult.ok).toBe(true);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect((invalidResult.error as Error & { code?: string }).code).toBe("INVALID_FILE_VALUE");
    }
  });

  it("validates location coordinate ranges", () => {
    resetFactories();
    const field = makeField({
      name: "office_location",
      fieldType: "LOCATION",
    });
    const record = makeRecord({
      data: {
        office_location: {
          lat: 120,
          lng: 30,
        },
      },
    });

    const result = record.validateAgainstSchema([field]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_LOCATION_VALUE");
    }
  });

  it("accepts valid image metadata and rejects non-image mime type", () => {
    resetFactories();
    const field = makeField({
      name: "avatar",
      fieldType: "IMAGE",
    });

    const validRecord = makeRecord({
      data: {
        avatar: {
          bucket: "record_files",
          path: "workspace-1/collection-1/avatar/profile.png",
          name: "profile.png",
          mimeType: "image/png",
          size: 1024,
        },
      },
    });

    const invalidRecord = makeRecord({
      data: {
        avatar: {
          bucket: "record_files",
          path: "workspace-1/collection-1/avatar/profile.pdf",
          name: "profile.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      },
    });

    const validResult = validRecord.validateAgainstSchema([field]);
    const invalidResult = invalidRecord.validateAgainstSchema([field]);

    expect(validResult.ok).toBe(true);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect((invalidResult.error as Error & { code?: string }).code).toBe("INVALID_IMAGE_VALUE");
    }
  });

  it("serializes validated data records", () => {
    resetFactories();
    const record = makeRecord({
      id: "record-1",
      collectionId: "collection-1",
      accountId: "workspace-1",
      data: { title: "Launch Plan" },
    });

    expect(record.toJSON()).toEqual({
      id: "record-1",
      collectionId: "collection-1",
      accountId: "workspace-1",
      data: { title: "Launch Plan" },
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  });
});
