import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

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
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('propagates search and filters changes correctly', async () => {
    resetFactories()
    const field = makeField({ name: 'title', displayName: 'Title' })
    const record = makeRecord({
      collectionId: field.collectionId,
      data: { title: 'Alpha' }
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

    // Test Search (Prop change)
    const searchInput = screen.getByPlaceholderText('Buscar registros...')
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
    })
    expect(onSearchChange).toHaveBeenCalledWith('alpha')

    // Test Filters (Debounced)
    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }))
    fireEvent.click(screen.getByText(/Añadir/i))
    
    const filterInput = screen.getByPlaceholderText('Filtrar Title...')
    
    await act(async () => {
      fireEvent.change(filterInput, { target: { value: 'alp' } })
    })

    // Advance timers for debounce (600ms)
    await act(async () => {
      vi.advanceTimersByTime(610)
    })

    expect(onFiltersChange).toHaveBeenCalled()
  })

  it('supports inline editing for basic fields', async () => {
    resetFactories()
    // Use explicit TEXT field type
    const field = makeField({ name: 'title', displayName: 'Title', fieldType: 'TEXT' })
    const record = makeRecord({
      id: 'record-1',
      collectionId: field.collectionId,
      data: { title: 'Alpha' },
    })
    const onInlineEdit = vi.fn(() => Promise.resolve())

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
    
    await act(async () => {
      fireEvent.doubleClick(cell)
    })

    const input = screen.getByDisplayValue('Alpha')
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Beta' } })
      fireEvent.blur(input)
    })

    // Wait for the async call
    expect(onInlineEdit).toHaveBeenCalled()
  })
})
