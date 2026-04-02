import { CollectionPermission } from '../entities/permission.entity'
import { Result } from '@/shared/domain/result'

export interface IPermissionRepository {
  findByRoleAndCollection(roleId: string, collectionId: string): Promise<Result<CollectionPermission | null>>
  findByRoleId(roleId: string): Promise<Result<CollectionPermission[]>>
  findByCollectionId(collectionId: string): Promise<Result<CollectionPermission[]>>
  findByAccountId(accountId: string): Promise<Result<CollectionPermission[]>>
  upsert(permission: CollectionPermission): Promise<Result<CollectionPermission>>
  delete(id: string): Promise<Result<void>>
}
