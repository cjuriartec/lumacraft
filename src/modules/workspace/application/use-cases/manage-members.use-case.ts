import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { IWorkspaceMemberRepository } from '../../domain/ports/workspace-member-repository.port'
import { IWorkspaceRepository } from '../../domain/ports/workspace-repository.port'
import { WorkspaceMember } from '../../domain/entities/workspace-member.entity'

export interface AddMemberRequest {
  workspaceId: string
  userId: string
  roleId: string
}

export interface AddMemberByEmailRequest {
  workspaceId: string
  email: string
  roleId: string
}

export interface UpdateMemberRoleRequest {
  memberId: string
  roleId: string
}

export class ManageMembersUseCase {
  constructor(
    private readonly memberRepository: IWorkspaceMemberRepository,
    private readonly workspaceRepository: IWorkspaceRepository
  ) {}

  async list(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    return this.memberRepository.findByWorkspaceId(workspaceId)
  }

  async addMember(request: AddMemberRequest): Promise<Result<WorkspaceMember>> {
    const existing = await this.memberRepository.findByUserAndWorkspace(request.userId, request.workspaceId)
    if (existing.ok && existing.value) {
      return fail(new DomainError('User is already a member of this workspace', 'ALREADY_EXISTS'))
    }

    const member = new WorkspaceMember({
      id: crypto.randomUUID(),
      workspaceId: request.workspaceId,
      userId: request.userId,
      roleId: request.roleId,
    })

    return this.memberRepository.addMember(member)
  }

  async addMemberByEmail(request: AddMemberByEmailRequest): Promise<Result<WorkspaceMember>> {
    // 1. Resolve email → UUID via RPC
    const userResult = await this.memberRepository.findUserIdByEmail(request.email)
    if (!userResult.ok) return fail(userResult.error)
    if (!userResult.value) {
      return fail(new DomainError('No existe ningún usuario registrado con ese correo electrónico.', 'NOT_FOUND'))
    }

    const userId = userResult.value

    // 2. Check if already a member
    const existing = await this.memberRepository.findByUserAndWorkspace(userId, request.workspaceId)
    if (existing.ok && existing.value) {
      return fail(new DomainError('Este usuario ya es miembro del workspace.', 'ALREADY_EXISTS'))
    }

    // 3. Create member
    const member = new WorkspaceMember({
      id: crypto.randomUUID(),
      workspaceId: request.workspaceId,
      userId,
      roleId: request.roleId,
    })

    return this.memberRepository.addMember(member)
  }

  async updateRole(request: UpdateMemberRoleRequest): Promise<Result<WorkspaceMember>> {
    const member = await this.memberRepository.findById(request.memberId)
    if (!member.ok) return fail(member.error)
    if (!member.value) return fail(new DomainError('Member not found', 'NOT_FOUND'))

    // Protect workspace owner role
    const workspace = await this.workspaceRepository.findById(member.value.workspaceId)
    if (workspace.ok && workspace.value && workspace.value.ownerId === member.value.userId) {
      return fail(new DomainError('Cannot change role of the workspace owner', 'FORBIDDEN'))
    }

    return this.memberRepository.updateMemberRole(request.memberId, request.roleId)
  }

  async removeMember(memberId: string): Promise<Result<void>> {
    const member = await this.memberRepository.findById(memberId)
    if (!member.ok) return fail(member.error)
    if (!member.value) return fail(new DomainError('Member not found', 'NOT_FOUND'))

    // Protect workspace owner removal
    const workspace = await this.workspaceRepository.findById(member.value.workspaceId)
    if (workspace.ok && workspace.value && workspace.value.ownerId === member.value.userId) {
      return fail(new DomainError('Owner cannot be removed from the workspace', 'FORBIDDEN'))
    }

    return this.memberRepository.removeMember(memberId)
  }
}
