import { Field } from '../entities/field.entity'
import { Result } from '@/shared/domain/result'

export interface IFieldRepository {
  findByCollectionId(collectionId: string): Promise<Result<Field[]>>
  findById(id: string): Promise<Result<Field | null>>
  create(field: Field): Promise<Result<Field>>
  update(field: Field): Promise<Result<Field>>
  delete(id: string): Promise<Result<void>>
  reorder(collectionId: string, fieldIds: string[]): Promise<Result<void>>
}
