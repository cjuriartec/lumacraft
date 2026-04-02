import { DomainError, fail, Result } from "@/shared/domain/result";

import { Role } from "../../domain/entities/role.entity";
import { IRoleRepository } from "../../domain/ports/role-repository.port";

export interface CreateRoleRequest {
  accountId: string;
  name: string;
  description: string | null;
  isSuperadmin?: boolean;
}

export interface UpdateRoleRequest {
  id: string;
  name: string;
  description: string | null;
}

export class ManageRolesUseCase {
  constructor(private readonly roleRepository: IRoleRepository) {}

  async list(accountId: string): Promise<Result<Role[]>> {
    return this.roleRepository.findAllByAccount(accountId);
  }

  async create(request: CreateRoleRequest): Promise<Result<Role>> {
    const result = Role.create({
      id: crypto.randomUUID(),
      accountId: request.accountId,
      name: request.name,
      description: request.description,
      isSuperadmin: request.isSuperadmin ?? false,
    });

    if (!result.ok) {
      return result;
    }

    return this.roleRepository.create(result.value);
  }

  async update(request: UpdateRoleRequest): Promise<Result<Role>> {
    const roleResult = await this.roleRepository.findById(request.id);
    if (!roleResult.ok) return fail(roleResult.error);
    if (!roleResult.value) return fail(new DomainError("Role not found", "NOT_FOUND"));

    const result = Role.create({
      ...roleResult.value.toJSON(),
      name: request.name,
      description: request.description,
    });

    if (!result.ok) {
      return result;
    }

    return this.roleRepository.update(result.value);
  }

  async delete(id: string): Promise<Result<void>> {
    const roleResult = await this.roleRepository.findById(id);
    if (!roleResult.ok) return fail(roleResult.error);
    if (!roleResult.value) return fail(new DomainError("Role not found", "NOT_FOUND"));

    if (roleResult.value.isSuperadmin) {
      return fail(new DomainError("Cannot delete superadmin role", "FORBIDDEN"));
    }

    return this.roleRepository.delete(id);
  }
}
