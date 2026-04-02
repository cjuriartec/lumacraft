import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { IPermissionRepository } from '../../domain/ports/permission-repository.port'
import { PermissionActionType } from '../../domain/value-objects/permission-action.vo'
import { SupabaseClient } from '@supabase/supabase-js'

export interface CheckPermissionRequest {
  userId: string
  collectionId: string
  action: PermissionActionType
}

export class CheckPermissionUseCase {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly supabase: SupabaseClient,
  ) {}

  async execute(request: CheckPermissionRequest): Promise<Result<boolean>> {
    // 1. Get the collection's account_id
    const { data: collection, error: collError } = await this.supabase
      .from('collections')
      .select('account_id')
      .eq('id', request.collectionId)
      .single()

    if (collError || !collection) {
      return fail(new DomainError('Collection not found', 'NOT_FOUND'))
    }

    const accountId = collection.account_id as string

    // 2. Check if user is account owner (full access)
    const { data: account } = await this.supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single()

    if (account && account.owner_id === request.userId) {
      return ok(true)
    }

    // 3. Get user's role in this account
    const { data: member } = await this.supabase
      .from('account_members')
      .select('role_id')
      .eq('account_id', accountId)
      .eq('user_id', request.userId)
      .single()

    if (!member || !member.role_id) {
      return ok(false) // Not a member
    }

    // 4. Check superadmin bypass
    const { data: role } = await this.supabase
      .from('roles')
      .select('is_superadmin')
      .eq('id', member.role_id)
      .single()

    if (role?.is_superadmin) {
      return ok(true)
    }

    // 5. Check granular permission
    const permResult = await this.permissionRepository.findByRoleAndCollection(
      member.role_id,
      request.collectionId,
    )

    if (!permResult.ok) return fail(permResult.error)

    const permission = permResult.value
    if (!permission) {
      // No explicit permission record → no access for non-owner roles
      return ok(false)
    }

    return ok(permission.hasPermission(request.action))
  }
}
