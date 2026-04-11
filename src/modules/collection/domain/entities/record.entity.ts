import { BaseEntity } from "@/shared/domain/base-entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { Field } from "./field.entity";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

type FileMetadataValue = {
  bucket: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

function isValidFileMetadata(value: unknown): value is FileMetadataValue {
  if (!isPlainObject(value)) return false;

  const requiredKeys = ["bucket", "path", "name", "mimeType", "size"] as const;
  for (const key of requiredKeys) {
    if (!(key in value)) return false;
  }

  return (
    typeof value.bucket === "string" &&
    typeof value.path === "string" &&
    typeof value.name === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.size === "number"
  );
}

interface DataRecordProps {
  id: string;
  collectionId: string;
  accountId: string;
  data: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DataRecord extends BaseEntity {
  private props: DataRecordProps;

  constructor(props: DataRecordProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get collectionId(): string {
    return this.props.collectionId;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get data(): Record<string, unknown> {
    return this.props.data;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  get updatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  /**
   * Validates the record data against a collection schema (fields)
   */
  public validateAgainstSchema(fields: Field[]): Result<void> {
    for (const field of fields) {
      const value = this.data[field.name];

      // Check required
      if (
        field.isRequired &&
        (value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0))
      ) {
        return fail(
          new DomainError(
            `Field ${field.displayName || field.name} is required`,
            "REQUIRED_FIELD_MISSING",
          ),
        );
      }

      // If value is provided, validate type (simple check for now, can be more robust)
      if (value !== undefined && value !== null) {
        const typeValue = field.fieldType.value;

        if (typeValue === "REVERSE_LOOKUP") {
          // Reverse lookups are computed virtually, skip direct validation
          continue;
        }

        if (typeValue === "NUMBER" && typeof value !== "number" && isNaN(Number(value))) {
          return fail(
            new DomainError(
              `Field ${field.displayName || field.name} must be a number`,
              "INVALID_TYPE",
            ),
          );
        }

        if (
          typeValue === "BOOLEAN" &&
          typeof value !== "boolean" &&
          value !== "true" &&
          value !== "false"
        ) {
          return fail(
            new DomainError(
              `Field ${field.displayName || field.name} must be a boolean`,
              "INVALID_TYPE",
            ),
          );
        }

        if (typeValue === "ENUM") {
          const options = (field.config?.value as { options?: string[] })?.options;
          if (options && !options.includes(String(value))) {
            return fail(
              new DomainError(
                `Value ${value} is not a valid option for ${field.displayName || field.name}`,
                "INVALID_ENUM_VALUE",
              ),
            );
          }
        }

        if (typeValue === "RELATION") {
          const relationConfig = field.config?.value as { relationType?: string } | undefined;
          const relationType = relationConfig?.relationType;
          const isPlural = relationType === "ONE_TO_MANY" || relationType === "MANY_TO_MANY";
          const isSingular = relationType === "ONE_TO_ONE" || relationType === "MANY_TO_ONE";

          if (isPlural) {
            if (!Array.isArray(value)) {
              return fail(
                new DomainError(
                  `Field ${field.displayName || field.name} requires an array of UUIDs for ${relationType}`,
                  "INVALID_RELATION_VALUE",
                ),
              );
            }
            if (!value.every(isUuid)) {
              return fail(
                new DomainError(
                  `Field ${field.displayName || field.name} must contain valid relation UUIDs`,
                  "INVALID_RELATION_VALUE",
                ),
              );
            }
          } else if (isSingular) {
            if (Array.isArray(value) || !isUuid(value)) {
              return fail(
                new DomainError(
                  `Field ${field.displayName || field.name} requires a single UUID string for ${relationType}`,
                  "INVALID_RELATION_VALUE",
                ),
              );
            }
          } else {
            // Fallback if relation type is missing or malformed
            if (Array.isArray(value)) {
              if (!value.every(isUuid)) {
                return fail(
                  new DomainError(
                    `Field ${field.displayName || field.name} must contain valid relation UUIDs`,
                    "INVALID_RELATION_VALUE",
                  ),
                );
              }
            } else if (!isUuid(value)) {
              return fail(
                new DomainError(
                  `Field ${field.displayName || field.name} must be a relation UUID`,
                  "INVALID_RELATION_VALUE",
                ),
              );
            }
          }
        }

        if (typeValue === "FILE") {
          if (!isValidFileMetadata(value)) {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} has invalid file metadata`,
                "INVALID_FILE_VALUE",
              ),
            );
          }
        }

        if (typeValue === "IMAGE") {
          if (!isValidFileMetadata(value)) {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} has invalid image metadata`,
                "INVALID_IMAGE_VALUE",
              ),
            );
          }

          if (!value.mimeType.startsWith("image/")) {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} must contain an image mime type`,
                "INVALID_IMAGE_VALUE",
              ),
            );
          }
        }

        if (typeValue === "LOCATION") {
          if (!isPlainObject(value)) {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} must be an object with lat/lng`,
                "INVALID_LOCATION_VALUE",
              ),
            );
          }

          const lat = value.lat;
          const lng = value.lng;

          if (typeof lat !== "number" || typeof lng !== "number") {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} requires numeric lat/lng`,
                "INVALID_LOCATION_VALUE",
              ),
            );
          }

          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return fail(
              new DomainError(
                `Field ${field.displayName || field.name} has out-of-range coordinates`,
                "INVALID_LOCATION_VALUE",
              ),
            );
          }
        }
      }
    }

    return ok(undefined);
  }

  public toJSON() {
    return {
      id: this.id,
      collectionId: this.collectionId,
      accountId: this.accountId,
      data: this.data,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
