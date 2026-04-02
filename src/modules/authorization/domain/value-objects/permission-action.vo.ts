import { Result, ok, fail, DomainError } from '@/shared/domain/result'

const VALID_ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'] as const
export type PermissionActionType = (typeof VALID_ACTIONS)[number]

export class PermissionAction {
  private constructor(public readonly value: PermissionActionType) {}

  static create(value: string): Result<PermissionAction> {
    const upper = value.toUpperCase() as PermissionActionType
    if (!VALID_ACTIONS.includes(upper)) {
      return fail(new DomainError(`Invalid permission action: ${value}`, 'INVALID_PERMISSION_ACTION'))
    }
    return ok(new PermissionAction(upper))
  }

  /** MANAGE implies all CRUD actions */
  implies(action: PermissionActionType): boolean {
    if (this.value === 'MANAGE') return true
    return this.value === action
  }
}
