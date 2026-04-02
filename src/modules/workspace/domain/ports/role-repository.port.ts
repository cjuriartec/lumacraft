import { Result } from '@/shared/domain/result'
import { Role } from '../entities/role.entity'

export interface IRoleRepository {
  findAllByAccount(accountId: string): Promise<Result<Role[]>>
  findById(id: string): Promise<Result<Role | null>>
  create(role: Role): Promise<Result<Role>>
  update(role: Role): Promise<Result<Role>>
  delete(id: string): Promise<Result<void>>
}
