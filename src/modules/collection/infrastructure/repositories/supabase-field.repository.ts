import { BaseRepository } from '@/shared/infrastructure/base-repository'
import { IFieldRepository } from '../../domain/ports/field-repository.port'
import { Field } from '../../domain/entities/field.entity'
import { FieldType } from '../../domain/value-objects/field-type.vo'
import { FieldConfig } from '../../domain/value-objects/field-config.vo'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseFieldRepository extends BaseRepository implements IFieldRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'fields')
  }

  public async findByCollectionId(collectionId: string): Promise<Result<Field[]>> {
    const { data, error } = await this.table
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    return ok(data.map((item: Record<string, unknown>) => this.toEntity(item)))
  }

  public async findById(id: string): Promise<Result<Field | null>> {
    const { data, error } = await this.table.select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return ok(null)
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(this.toEntity(data))
  }

  public async create(field: Field): Promise<Result<Field>> {
    const persistence = this.toPersistence(field)
    const { data, error } = await this.table.insert(persistence).select().single()

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    return ok(this.toEntity(data))
  }

  public async update(field: Field): Promise<Result<Field>> {
    const persistence = this.toPersistence(field)
    const { data, error } = await this.table
      .update(persistence)
      .eq('id', field.id)
      .select()
      .single()

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    return ok(this.toEntity(data))
  }

  public async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq('id', id)
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(undefined)
  }

  public async reorder(collectionId: string, fieldIds: string[]): Promise<Result<void>> {
    const updates = fieldIds.map((id, index) => ({
      id,
      sort_order: index,
    }))

    // Basic implementation with loop for now. Consider server function for batch updates if list is large.
    for (const update of updates) {
      const { error } = await this.table.update({ sort_order: update.sort_order }).eq('id', update.id)
      if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(undefined)
  }

  private toEntity(data: Record<string, unknown>): Field {
    const fieldTypeRes = FieldType.create(data.field_type as string)
    if (!fieldTypeRes.ok) throw new Error('Stored data has invalid field type')

    const fieldConfig = FieldConfig.create(fieldTypeRes.value.value, (data.config as Record<string, unknown>) || {})
    
    return new Field({
      id: data.id as string,
      collectionId: data.collection_id as string,
      name: data.name as string,
      displayName: (data.display_name as string) || undefined,
      fieldType: fieldTypeRes.value,
      isRequired: data.is_required as boolean,
      isUnique: data.is_unique as boolean,
      defaultValue: (data.default_value as string) || undefined,
      config: fieldConfig.ok ? fieldConfig.value : undefined,
      sortOrder: data.sort_order as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    })
  }

  private toPersistence(field: Field) {
    const json = field.toJSON()
    return {
      id: json.id,
      collection_id: json.collectionId,
      name: json.name,
      display_name: json.displayName,
      field_type: json.fieldType,
      is_required: json.isRequired,
      is_unique: json.isUnique,
      default_value: json.defaultValue,
      config: json.config,
      sort_order: json.sortOrder,
      updated_at: new Date().toISOString(),
    }
  }
}
