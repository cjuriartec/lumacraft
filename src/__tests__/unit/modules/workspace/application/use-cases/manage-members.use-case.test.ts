import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";

import {
  makeWorkspace,
  makeWorkspaceMember,
} from "../../../../../../__tests__/factories/domain-factories";
import { ManageMembersUseCase } from "../../../../../../modules/workspace/application/use-cases/manage-members.use-case";
import { IWorkspaceMemberRepository } from "../../../../../../modules/workspace/domain/ports/workspace-member-repository.port";
import { IWorkspaceRepository } from "../../../../../../modules/workspace/domain/ports/workspace-repository.port";
import { DomainError, ok } from "../../../../../../shared/domain/result";

describe("ManageMembersUseCase", () => {
  let useCase: ManageMembersUseCase;
  let memberRepository: Mocked<IWorkspaceMemberRepository>;
  let workspaceRepository: Mocked<IWorkspaceRepository>;

  beforeEach(() => {
    memberRepository = {
      findByWorkspaceId: vi.fn(),
      findById: vi.fn(),
      addMember: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      findByUserAndWorkspace: vi.fn(),
      findUserIdByEmail: vi.fn(),
    };

    workspaceRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    useCase = new ManageMembersUseCase(memberRepository, workspaceRepository);
  });

  describe("removeMember", () => {
    it("should fail if member to remove is the workspace owner", async () => {
      const workspaceId = "workspace-1";
      const userId = "user-owner";
      const memberId = "member-1";

      const member = makeWorkspaceMember({
        id: memberId,
        workspaceId,
        userId,
        roleId: "role-1",
      });

      const workspace = makeWorkspace({
        id: workspaceId,
        name: "My Workspace",
        ownerId: userId,
      });

      memberRepository.findById.mockResolvedValue(ok(member));
      workspaceRepository.findById.mockResolvedValue(ok(workspace));

      const result = await useCase.removeMember(memberId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as DomainError).code).toBe("FORBIDDEN");
        expect(result.error.message).toContain("Owner cannot be removed");
      }
      expect(memberRepository.removeMember).not.toHaveBeenCalled();
    });

    it("should succeed if member is NOT the owner", async () => {
      const workspaceId = "workspace-1";
      const userId = "user-regular";
      const memberId = "member-1";

      const member = makeWorkspaceMember({
        id: memberId,
        workspaceId,
        userId,
        roleId: "role-1",
      });

      const workspace = makeWorkspace({
        id: workspaceId,
        name: "My Workspace",
        ownerId: "different-owner",
      });

      memberRepository.findById.mockResolvedValue(ok(member));
      workspaceRepository.findById.mockResolvedValue(ok(workspace));
      memberRepository.removeMember.mockResolvedValue(ok(undefined));

      const result = await useCase.removeMember(memberId);

      expect(result.ok).toBe(true);
      expect(memberRepository.removeMember).toHaveBeenCalledWith(memberId);
    });
  });
});
