import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeCollection } from '@/__tests__/factories/domain-factories'
import CollectionsPage from '@/modules/collection/presentation/pages/collections-page'

const collectionsState = vi.hoisted(() => ({
  collections: [] as ReturnType<typeof makeCollection>[],
  loading: false,
  deleteCollection: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/modules/collection/presentation/hooks/use-collections', () => ({
  useCollections: () => collectionsState,
}))

vi.mock('@/modules/collection/presentation/components/create-collection-dialog', () => ({
  CreateCollectionDialog: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="create-collection-dialog">{children ?? 'create-collection-dialog'}</div>
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/modules/workspace/presentation/providers/workspace-provider', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: 'workspace-1', ownerId: 'user-1' },
  }),
}))

vi.mock('@/modules/auth/presentation/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}))

vi.mock('@/modules/workspace/presentation/hooks/use-members', () => ({
  useMembers: () => ({
    members: [{ userId: 'user-1', roleId: 'role-1' }],
  }),
}))

vi.mock('@/modules/workspace/presentation/hooks/use-roles', () => ({
  useRoles: () => ({
    roles: [{ id: 'role-1', isSuperadmin: true }],
  }),
}))

vi.mock('@/shared/presentation/providers/breadcrumb-provider', () => ({
  useBreadcrumbs: vi.fn(),
}))

describe('CollectionsPage', () => {
  beforeEach(() => {
    collectionsState.collections = []
    collectionsState.loading = false
    collectionsState.deleteCollection.mockReset()
    collectionsState.refresh.mockReset()
  })

  it('renders the loading state', () => {
    collectionsState.loading = true

    render(<CollectionsPage />)

    expect(screen.getByText('Cargando colecciones...')).toBeInTheDocument()
  })

  it('renders the empty state when there are no collections', () => {
    render(<CollectionsPage />)

    expect(screen.getByText('Sin colecciones todavía')).toBeInTheDocument()
    expect(screen.getAllByTestId('create-collection-dialog')).toHaveLength(2)
  })

  it('renders collection cards and delegates deletion', () => {
    collectionsState.collections = [
      makeCollection({
        id: 'collection-1',
        name: 'projects',
        displayName: 'Projects',
      }),
    ]

    render(<CollectionsPage />)

    fireEvent.click(screen.getByLabelText('Eliminar colección Projects'))

    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(collectionsState.deleteCollection).toHaveBeenCalledWith('collection-1')
    expect(screen.getByText('Ver Datos')).toHaveAttribute('href', '/collections/collection-1')
  })
})

