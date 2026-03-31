import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeField, makeRecord, resetFactories } from '@/__tests__/factories/domain-factories'
import { CollectionDetailPage } from '@/modules/collection/presentation/pages/collection-detail-page'

const fieldsState = vi.hoisted(() => ({
  fields: [] as ReturnType<typeof makeField>[],
  loading: false,
  createField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
}))

const recordsState = vi.hoisted(() => ({
  records: [] as ReturnType<typeof makeRecord>[],
  total: 0,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 25,
    sortField: 'created_at',
    sortDirection: 'desc' as const,
  },
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  setPage: vi.fn(),
  setSort: vi.fn(),
}))

vi.mock('@/modules/collection/presentation/hooks/use-fields', () => ({
  useFields: () => fieldsState,
}))

vi.mock('@/modules/collection/presentation/hooks/use-records', () => ({
  useRecords: () => recordsState,
}))

vi.mock('@/modules/collection/presentation/components/field-manager', () => ({
  FieldManager: () => <div>field-manager</div>,
}))

vi.mock('@/modules/collection/presentation/components/data-grid', () => ({
  DataGrid: ({
    records,
    onEdit,
    onDelete,
  }: {
    records: ReturnType<typeof makeRecord>[]
    onEdit: (record: ReturnType<typeof makeRecord>) => void
    onDelete: (id: string) => void
  }) => (
    <div>
      <span>data-grid</span>
      {records[0] ? (
        <>
          <button type="button" onClick={() => onEdit(records[0])}>
            edit-record
          </button>
          <button type="button" onClick={() => onDelete(records[0].id)}>
            delete-record
          </button>
        </>
      ) : null}
    </div>
  ),
}))

vi.mock('@/modules/collection/presentation/components/record-form-dialog', () => ({
  RecordFormDialog: ({
    open,
    record,
    onSubmit,
  }: {
    open: boolean
    record?: ReturnType<typeof makeRecord>
    onSubmit: (data: Record<string, unknown>) => Promise<unknown>
  }) =>
    open ? (
      <div>
        <span>{record ? `editing:${record.id}` : 'editing:new'}</span>
        <button type="button" onClick={() => void onSubmit({ title: 'Submitted' })}>
          submit-dialog
        </button>
      </div>
    ) : null,
}))

describe('CollectionDetailPage', () => {
  beforeEach(() => {
    resetFactories()
    fieldsState.fields = [makeField({ collectionId: 'collection-1', name: 'title' })]
    fieldsState.loading = false
    recordsState.records = [makeRecord({ id: 'record-1', collectionId: 'collection-1', data: { title: 'Alpha' } })]
    recordsState.total = 1
    recordsState.loading = false
    recordsState.createRecord.mockReset()
    recordsState.updateRecord.mockReset()
    recordsState.deleteRecord.mockReset()
  })

  it('renders the loading state while fields and records are syncing', () => {
    fieldsState.loading = true
    recordsState.records = []
    recordsState.loading = true

    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />)

    expect(screen.getByText('Sincronizando datos...')).toBeInTheDocument()
  })

  it('creates a record from the dialog opened by the new record button', () => {
    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />)

    fireEvent.click(screen.getByText('Nuevo Registro'))
    fireEvent.click(screen.getByText('submit-dialog'))

    expect(screen.getByText('editing:new')).toBeInTheDocument()
    expect(recordsState.createRecord).toHaveBeenCalledWith({ title: 'Submitted' })
  })

  it('edits and deletes records via the data grid callbacks', () => {
    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />)

    fireEvent.click(screen.getByText('edit-record'))
    fireEvent.click(screen.getByText('submit-dialog'))
    fireEvent.click(screen.getByText('delete-record'))

    expect(screen.getByText('editing:record-1')).toBeInTheDocument()
    expect(recordsState.updateRecord).toHaveBeenCalledWith('record-1', { title: 'Submitted' })
    expect(recordsState.deleteRecord).toHaveBeenCalledWith('record-1')
  })
})
