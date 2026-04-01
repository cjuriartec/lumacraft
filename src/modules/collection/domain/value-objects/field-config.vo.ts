import { z } from 'zod'
import { FieldTypeValue } from './field-type.vo'
import { Result, ok, fail } from '@/shared/domain/result'

// Config schema per field type
const textConfigSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().positive().optional(),
  placeholder: z.string().optional(),
  multiline: z.boolean().optional(),
})

const numberConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  decimals: z.number().int().min(0).max(10).optional(),
})

const enumConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(1, 'At least one option is required'),
})

const dateConfigSchema = z.object({
  includeTime: z.boolean().optional(),
})

const booleanConfigSchema = z.object({
  trueLabel: z.string().optional(),
  falseLabel: z.string().optional(),
})

const relationTypeSchema = z.enum(['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'])
const onDeleteSchema = z.enum(['CASCADE', 'SET_NULL', 'RESTRICT'])

const relationConfigSchema = z.object({
  targetCollectionId: z.string().uuid(),
  relationType: relationTypeSchema,
  displayField: z.string().min(1),
  allowMultiple: z.boolean().optional(),
  bidirectional: z.boolean().optional(),
  inverseFieldName: z.string().min(1).optional(),
  onDelete: onDeleteSchema.optional(),
})

const fileConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string().min(1)).optional(),
  maxSizeBytes: z.number().int().positive().optional(),
})

const locationConfigSchema = z.object({
  minLat: z.number().min(-90).max(90).optional(),
  maxLat: z.number().min(-90).max(90).optional(),
  minLng: z.number().min(-180).max(180).optional(),
  maxLng: z.number().min(-180).max(180).optional(),
})

const configSchemas: Record<FieldTypeValue, z.ZodType> = {
  TEXT: textConfigSchema,
  NUMBER: numberConfigSchema,
  ENUM: enumConfigSchema,
  DATE: dateConfigSchema,
  BOOLEAN: booleanConfigSchema,
  RELATION: relationConfigSchema,
  FILE: fileConfigSchema,
  LOCATION: locationConfigSchema,
}

export type TextConfig = z.infer<typeof textConfigSchema>
export type NumberConfig = z.infer<typeof numberConfigSchema>
export type EnumConfig = z.infer<typeof enumConfigSchema>
export type DateConfig = z.infer<typeof dateConfigSchema>
export type BooleanConfig = z.infer<typeof booleanConfigSchema>
export type RelationTypeValue = z.infer<typeof relationTypeSchema>
export type OnDeleteValue = z.infer<typeof onDeleteSchema>
export type RelationConfig = z.infer<typeof relationConfigSchema>
export type FileConfig = z.infer<typeof fileConfigSchema>
export type LocationConfig = z.infer<typeof locationConfigSchema>
export type FieldConfigValue =
  | TextConfig
  | NumberConfig
  | EnumConfig
  | DateConfig
  | BooleanConfig
  | RelationConfig
  | FileConfig
  | LocationConfig

export class FieldConfig {
  private constructor(
    public readonly value: Record<string, unknown>,
    public readonly fieldType: FieldTypeValue,
  ) {}

  static create(fieldType: FieldTypeValue, raw: Record<string, unknown>): Result<FieldConfig> {
    const schema = configSchemas[fieldType]
    const result = schema.safeParse(raw)

    if (!result.success) {
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      return fail(new Error(`Invalid config for ${fieldType}: ${issues}`))
    }

    return ok(new FieldConfig(result.data as Record<string, unknown>, fieldType))
  }

  static empty(fieldType: FieldTypeValue): FieldConfig {
    return new FieldConfig({}, fieldType)
  }
}
