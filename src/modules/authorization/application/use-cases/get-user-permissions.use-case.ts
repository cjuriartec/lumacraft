import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { IPermissionRepository } from '../../domain/ports/permission-repository.port'
import { SupabaseClient } from '@supabase/supabase-js'

export interface CollectionPermissionMap {
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface UserPermissionsResult {
  isOwner: boolean
  isSuperAdmin: boolean
  permissions: Map<string, CollectionPermissionMap>
}

export class GetUserPermissionsUseCase {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly supabase: SupabaseClient,
  ) {}

  async execute(userId: string, accountId: string): Promise<Result<UserPermissionsResult>> {
    // 1. Check if user is owner
    const { data: account } = await this.supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single()

    const isOwner = account?.owner_id === userId

    // 2. Get user's role
    const { data: member } = await this.supabase
      .from('account_members')
      .select('role_id')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single()

    if (!member && !isOwner) {
      return ok({
        isOwner: false,
        isSuperAdmin: false,
        permissions: new Map(),
      })
    }

    // 3. Check superadmin
    let isSuperAdmin = false
    if (member?.role_id) {
      const { data: role } = await this.supabase
        .from('roles')
        .select('is_superadmin')
        .eq('id', member.role_id)
        .single()

      isSuperAdmin = !!role?.is_superadmin
    }

    // 4. If owner or superadmin, return full access (permissions won't be checked)
    if (isOwner || isSuperAdmin) {
      return ok({
        isOwner,
        isSuperAdmin,
        permissions: new Map(),
      })
    }

    // 5. Fetch all permissions for this role in this account
    if (!member?.role_id) {
      return ok({
        isOwner: false,
        isSuperAdmin: false,
        permissions: new Map(),
      })
    }

    const permResult = await this.permissionRepository.findByAccountId(accountId)
    if (!permResult.ok) return fail(permResult.error)

    const permissions = new Map<string, CollectionPermissionMap>()
    for (const perm of permResult.value) {
      if (perm.roleId === member.role_id) {
        permissions.set(perm.collectionId, {
          canRead: perm.canRead,
          canCreate: perm.canCreate,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
        })
      }
    }

    return ok({
      isOwner,
      isSuperAdmin,
      permissions,
    })
  }
}
