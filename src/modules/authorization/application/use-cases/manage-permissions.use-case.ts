import { IPermissionRepository } from '../../domain/ports/permission-repository.port'
import { CollectionPermission } from '../../domain/entities/permission.entity'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'

export interface UpsertPermissionRequest {
  id?: string
  roleId: string
  collectionId: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export class ManagePermissionsUseCase {
  constructor(private readonly permissionRepository: IPermissionRepository) {}

  async upsert(request: UpsertPermissionRequest): Promise<Result<CollectionPermission>> {
    const permission = new CollectionPermission({
      id: request.id || crypto.randomUUID(),
      roleId: request.roleId,
      collectionId: request.collectionId,
      canRead: request.canRead,
      canCreate: request.canCreate,
      canUpdate: request.canUpdate,
      canDelete: request.canDelete,
    })

    return this.permissionRepository.upsert(permission)
  }

  async delete(id: string): Promise<Result<void>> {
    return this.permissionRepository.delete(id)
  }

  async listByCollection(collectionId: string): Promise<Result<CollectionPermission[]>> {
    return this.permissionRepository.findByCollectionId(collectionId)
  }
}
