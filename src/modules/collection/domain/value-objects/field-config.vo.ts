import { z } from 'zod'
import { FieldTypeValue } from './field-type.vo'
import { Result, ok, fail } from '@/shared/domain/result'

// Config schema per field type
const textConfigSchema = z.object({
  maxLength: z.number().positive().optional(),
  placeholder: z.string().optional(),
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

const configSchemas: Record<FieldTypeValue, z.ZodType> = {
  TEXT: textConfigSchema,
  NUMBER: numberConfigSchema,
  ENUM: enumConfigSchema,
  DATE: dateConfigSchema,
  BOOLEAN: booleanConfigSchema,
}

export type TextConfig = z.infer<typeof textConfigSchema>
export type NumberConfig = z.infer<typeof numberConfigSchema>
export type EnumConfig = z.infer<typeof enumConfigSchema>
export type DateConfig = z.infer<typeof dateConfigSchema>
export type BooleanConfig = z.infer<typeof booleanConfigSchema>
export type FieldConfigValue = TextConfig | NumberConfig | EnumConfig | DateConfig | BooleanConfig

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
