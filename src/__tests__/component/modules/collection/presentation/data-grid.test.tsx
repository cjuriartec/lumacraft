import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { makeField, makeRecord, resetFactories } from '@/__tests__/factories/domain-factories'
import { DataGrid } from '@/modules/collection/presentation/components/data-grid'

vi.mock('@/modules/collection/presentation/hooks/use-relation-records', () => ({
  useRelationRecords: () => ({
    options: {},
    loading: {},
    searchRelations: vi.fn(),
    fetchOptionsByIds: vi.fn(async () => undefined),
    fetchBatchOptionsByIds: vi.fn(async () => undefined),
  }),
}))

vi.mock('@/modules/collection/presentation/hooks/use-storage', () => ({
  useStorage: () => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(async () => ({ ok: true, value: new Blob(['x']) })),
    deleteFiles: vi.fn(),
  }),
}))

describe('DataGrid', () => {
  it('propagates search and filters changes', () => {
    resetFactories()
    const field = makeField({ name: 'title', displayName: 'Title' })
    const record = makeRecord({
      collectionId: field.collectionId,
      data: { title: 'Alpha' },
    })
    const onSearchChange = vi.fn()
    const onFiltersChange = vi.fn()

    render(
      <DataGrid
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Buscar registros...'), {
      target: { value: 'alpha' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }))
    fireEvent.click(screen.getByRole('button', { name: /Añadir/i }))
    fireEvent.change(screen.getByPlaceholderText('Filtrar Title...'), {
      target: { value: 'alp' },
    })

    expect(onSearchChange).toHaveBeenCalledWith('alpha')
    expect(onFiltersChange).toHaveBeenCalled()
  })

  it('supports inline editing for basic fields', async () => {
    resetFactories()
    const field = makeField({ name: 'title', displayName: 'Title' })
    const record = makeRecord({
      id: 'record-1',
      collectionId: field.collectionId,
      data: { title: 'Alpha' },
    })
    const onInlineEdit = vi.fn(async () => undefined)

    render(
      <DataGrid
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={onInlineEdit}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const cell = screen.getByText('Alpha')
    fireEvent.doubleClick(cell)

    const input = screen.getByDisplayValue('Alpha')
    fireEvent.change(input, { target: { value: 'Beta' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onInlineEdit).toHaveBeenCalledOnce()
    })
  })
})
