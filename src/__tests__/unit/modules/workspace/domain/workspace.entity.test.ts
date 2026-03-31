import { describe, expect, it } from 'vitest'

import {
  makeWorkspace,
  makeWorkspaceMember,
  resetFactories,
} from '@/__tests__/factories/domain-factories'

describe('Workspace entity', () => {
  it('serializes the expected public shape', () => {
    resetFactories()
    const workspace = makeWorkspace({ name: 'Lumacraft HQ', ownerId: 'owner-1' })

    expect(workspace.toJSON()).toEqual({
      id: workspace.id,
      name: 'Lumacraft HQ',
      ownerId: 'owner-1',
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    })
  })
})

describe('WorkspaceMember entity', () => {
  it('maps joinedAt to createdAt in the JSON representation', () => {
    resetFactories()
    const member = makeWorkspaceMember({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      roleId: 'role-1',
    })

    expect(member.toJSON()).toEqual({
      id: member.id,
      workspaceId: 'workspace-1',
      userId: 'user-1',
      roleId: 'role-1',
      joinedAt: member.createdAt,
    })
  })
})

