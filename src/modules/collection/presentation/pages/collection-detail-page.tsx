'use client'

import { useState } from 'react'
import { useFields } from '../hooks/use-fields'
import { useRecords } from '../hooks/use-records'
import { FieldManager } from '../components/field-manager'
import { DataGrid } from '../components/data-grid'
import { RecordFormDialog } from '../components/record-form-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/presentation/components/ui/tabs'
import { Button } from '@/shared/presentation/components/ui/button'
import { LayoutGrid, ListFilter, Plus } from 'lucide-react'
import { DataRecord } from '../../domain/entities/record.entity'

interface CollectionDetailPageProps {
  collectionId: string
  collectionName: string
}

export function CollectionDetailPage({ collectionId, collectionName }: CollectionDetailPageProps) {
  const { fields, loading: loadingFields, createField, updateField, deleteField } = useFields(collectionId)
  const { 
    records, 
    total, 
    loading: loadingRecords, 
    pagination, 
    createRecord, 
    updateRecord, 
    deleteRecord,
    setPage,
    setSort 
  } = useRecords(collectionId)

  const [recordEditorOpen, setRecordEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DataRecord | undefined>(undefined)

  const handleEditRecord = (record: DataRecord) => {
    setEditingRecord(record)
    setRecordEditorOpen(true)
  }

  const handleCreateRecord = () => {
    setEditingRecord(undefined)
    setRecordEditorOpen(true)
  }

  const handleRecordSubmit = async (data: Record<string, unknown>) => {
    if (editingRecord) {
      return await updateRecord(editingRecord.id, data)
    } else {
      return await createRecord(data)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Simplified, responsive header */}
      <div className="flex flex-col gap-1 mb-8 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 text-primary">
          Colección
        </p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
          {collectionName}
        </h1>
        <p className="text-sm font-light text-foreground/70 max-w-xl leading-relaxed">
          Administra registros y configura el esquema estructural para <span className="font-medium text-foreground">{collectionName}</span>.
        </p>
      </div>

      <Tabs defaultValue="data" className="w-full" variant="line">
        <TabsList className="mb-8">
          <TabsTrigger value="data" className="flex items-center">
            <LayoutGrid size={16} className="mr-2" />
            Datos {total > 0 && <span className="ml-2 text-[10px] opacity-40 font-mono">({total})</span>}
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center">
            <ListFilter size={16} className="mr-2" />
            Esquema {fields.length > 0 && <span className="ml-2 text-[10px] opacity-40 font-mono">({fields.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-0 outline-none">
          {loadingFields || (loadingRecords && records.length === 0) ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-surface rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              <p className="text-muted text-xs font-light">Sincronizando datos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end px-2">
                <Button 
                  size="sm"
                  className="bg-primary text-background hover:bg-primary-hover shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                  onClick={handleCreateRecord}
                >
                  <Plus size={16} className="mr-2" />
                  Nuevo Registro
                </Button>
              </div>
              <div className="rounded-2xl bg-surface border border-border/5 overflow-hidden shadow-sm">
                <DataGrid 
                  fields={fields}
                  records={records}
                  total={total}
                  currentPage={pagination.page}
                  pageSize={pagination.pageSize}
                  sortField={pagination.sortField}
                  sortDirection={pagination.sortDirection}
                  onPageChange={setPage}
                  onSort={setSort}
                  onEdit={handleEditRecord}
                  onDelete={deleteRecord}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields" className="mt-0 focus-visible:outline-none pb-12">
          <div className="rounded-2xl bg-surface border border-border/5 p-8">
            <FieldManager 
              collectionId={collectionId} 
              fields={fields}
              loading={loadingFields}
              createField={createField}
              updateField={updateField}
              deleteField={deleteField}
            />
          </div>
        </TabsContent>
      </Tabs>

      <RecordFormDialog 
        open={recordEditorOpen}
        onOpenChange={setRecordEditorOpen}
        fields={fields}
        record={editingRecord}
        onSubmit={handleRecordSubmit}
      />
    </div>
  )
}
