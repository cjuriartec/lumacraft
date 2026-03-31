'use client'

import { Field } from '../../domain/entities/field.entity'
import { DataRecord } from '../../domain/entities/record.entity'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/presentation/components/ui/table'
import { Button } from '@/shared/presentation/components/ui/button'
import { ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/presentation/components/ui/badge'

interface DataGridProps {
  fields: Field[]
  records: DataRecord[]
  total: number
  currentPage: number
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  onPageChange: (page: number) => void
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onEdit: (record: DataRecord) => void
  onDelete: (id: string) => void
}

export function DataGrid({
  fields,
  records,
  total,
  currentPage,
  pageSize,
  sortField,
  sortDirection,
  onPageChange,
  onSort,
  onEdit,
  onDelete,
}: DataGridProps) {
  const totalPages = Math.ceil(total / pageSize)

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      onSort(fieldName, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(fieldName, 'asc')
    }
  }

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) return <ChevronUp className="h-4 w-4 opacity-20" />
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const renderCellValue = (record: DataRecord, field: Field) => {
    const value = record.data[field.name]

    if (value === undefined || value === null || value === '') {
      return <span className="text-zinc-700">—</span>
    }

    switch (field.fieldType.value) {
      case 'BOOLEAN':
        return (
          <Badge variant="outline" className={value ? "text-primary border-primary/20 bg-primary/5" : "text-muted border-border"}>
            {value ? 'Sí' : 'No'}
          </Badge>
        )
      case 'DATE':
        return <span className="text-foreground/80">{new Date(value as string).toLocaleDateString()}</span>
      case 'ENUM':
        return <Badge variant="secondary" className="font-normal">{String(value)}</Badge>
      case 'NUMBER':
        return <span className="font-mono text-foreground/80">{String(value)}</span>
      default:
        return <span className="text-foreground/80">{String(value)}</span>
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="overflow-hidden bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              {fields.map((field) => (
                <TableHead
                  key={field.id}
                  className="cursor-pointer select-none py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-foreground transition-colors"
                  onClick={() => handleSort(field.name)}
                >
                  <div className="flex items-center gap-2">
                    {field.displayName || field.name}
                    {getSortIcon(field.name)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[100px] text-right py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="h-48 text-center text-muted font-light italic">
                  No hay registros en esta colección.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="group border-b border-border/5 hover:bg-surface-hover/30 transition-colors">
                  {fields.map((field) => (
                    <TableCell key={field.id} className="py-4 px-4 font-normal text-sm">
                      {renderCellValue(record, field)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right py-4 px-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar registro ${record.id}`}
                        className="h-8 w-8 text-muted hover:text-foreground hover:bg-surface-hover"
                        onClick={() => onEdit(record as DataRecord)}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar registro ${record.id}`}
                        className="h-8 w-8 text-muted hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => onDelete(record.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between py-6 px-4">
          <p className="text-xs text-muted font-light">
            Mostrando <span className="text-foreground font-medium">{(currentPage - 1) * pageSize + 1}</span> a <span className="text-foreground font-medium">{Math.min(currentPage * pageSize, total)}</span> de <span className="text-foreground font-medium">{total}</span> registros
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>Página</span>
              <span className="text-foreground font-mono font-medium">{currentPage} / {totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-border/10 bg-surface/50 text-muted hover:text-foreground"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-border/10 bg-surface/50 text-muted hover:text-foreground"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
