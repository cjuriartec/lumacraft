'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/presentation/components/ui/dialog'
import { Button } from '@/shared/presentation/components/ui/button'
import { Input } from '@/shared/presentation/components/ui/input'
import { Label } from '@/shared/presentation/components/ui/label'
import { Switch } from '@/shared/presentation/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/presentation/components/ui/select'
import { Field } from '../../domain/entities/field.entity'
import { DataRecord } from '../../domain/entities/record.entity'
import { AlertCircle } from 'lucide-react'

interface RecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: Field[]
  record?: DataRecord
  onSubmit: (data: Record<string, unknown>) => Promise<any>
}

export function RecordFormDialog({
  open,
  onOpenChange,
  fields,
  record,
  onSubmit,
}: RecordFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate dynamic schema based on fields
  const getDynamicSchema = () => {
    const shape: any = {}
    
    fields.forEach((field) => {
      let validator: any = z.any()

      if (field.isRequired) {
        switch (field.fieldType.value) {
          case 'NUMBER':
            validator = z.coerce.number({ message: 'Debe ser un número' })
            break
          case 'BOOLEAN':
            validator = z.boolean().default(false)
            break
          case 'DATE':
            validator = z.string().min(1, 'La fecha es obligatoria')
            break
          default:
            validator = z.string().min(1, 'Este campo es obligatorio')
        }
      } else {
        validator = z.any().optional()
      }

      shape[field.name] = validator
    })

    return z.object(shape)
  }

  const form = useForm({
    resolver: zodResolver(getDynamicSchema()),
    defaultValues: record?.data || {}
  })

  // Reset form when record changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset(record?.data || {})
      setError(null)
    }
  }, [open, record, form])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    setError(null)
    try {
      const res = await onSubmit(values)
      if (res.ok) {
        onOpenChange(false)
        form.reset()
      } else {
        setError(res.error.message)
      }
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const renderFieldInput = (field: Field) => {
    const { name, fieldType, displayName, config } = field

    switch (fieldType.value) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2 py-2">
            <Switch
              id={name}
              checked={!!form.watch(name)}
              onCheckedChange={(val) => form.setValue(name, val)}
            />
            <Label htmlFor={name} className="text-muted">{displayName || name}</Label>
          </div>
        )

      case 'ENUM':
        const options = (config?.value as any)?.options || []
        return (
          <div className="space-y-2">
            <Label className="text-muted">{displayName || name}</Label>
            <Select
              value={form.watch(name) as string || ''}
              onValueChange={(val) => form.setValue(name, val)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground font-poppins">
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'NUMBER':
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted">{displayName || name}</Label>
            <Input
              id={name}
              type="number"
              className="bg-background border-border text-foreground"
              {...form.register(name)}
              value={(form.watch(name) as any) ?? ''}
            />
          </div>
        )

      case 'DATE':
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted">{displayName || name}</Label>
            <Input
              id={name}
              type="date"
              className="bg-background border-border text-foreground"
              {...form.register(name)}
              value={(form.watch(name) as string) || ''}
            />
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted">{displayName || name}</Label>
            <Input
              id={name}
              className="bg-background border-border text-foreground placeholder:text-muted/40"
              placeholder={(config?.value as any)?.placeholder || ''}
              {...form.register(name)}
            />
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-surface border-border overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {record ? 'Editar Registro' : 'Nuevo Registro'}
          </DialogTitle>
          <DialogDescription className="text-muted text-xs">
            {record ? 'Modifica los valores de este registro.' : 'Añade una nueva fila de datos a esta colección.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {fields.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted text-sm italic">Primero debes definir campos.</p>
            </div>
          ) : (
            fields.map((field) => (
              <div key={field.id}>
                {renderFieldInput(field)}
                {form.formState.errors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">
                    {String(form.formState.errors[field.name]?.message)}
                  </p>
                )}
              </div>
            ))
          )}

          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-muted hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary text-background hover:bg-primary-hover"
              disabled={loading || fields.length === 0}
            >
              {loading ? 'Guardando...' : record ? 'Actualizar' : 'Crear Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
