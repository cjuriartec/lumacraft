'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import { TagInput } from '@/shared/presentation/components/ui/tag-input'
import { Field } from '../../domain/entities/field.entity'

const fieldSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos'),
  displayName: z.string().min(2, 'El nombre visible debe tener al menos 2 caracteres'),
  fieldType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM']),
  isRequired: z.boolean().default(false).optional(),
  isUnique: z.boolean().default(false).optional(),
  defaultValue: z.string().optional(),
  config: z.record(z.string(), z.any()).default({}).optional(),
})

type FieldFormValues = z.infer<typeof fieldSchema>

interface FieldFormDialogProps {
  field?: Field
  onSubmit: (values: FieldFormValues) => Promise<any>
  children?: React.ReactNode
}

export function FieldFormDialog({ field, onSubmit, children }: FieldFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema) as any,
    defaultValues: field
      ? {
        name: field.name,
        displayName: field.displayName || '',
        fieldType: field.fieldType.value as any,
        isRequired: field.isRequired,
        isUnique: field.isUnique,
        defaultValue: field.defaultValue || '',
        config: (field.config?.value as any) || {},
      }
      : {
        name: '',
        displayName: '',
        fieldType: 'TEXT',
        isRequired: false,
        isUnique: false,
        defaultValue: '',
        config: {},
      },
  })

  // Reset when open
  useEffect(() => {
    if (open) {
      setError(null)
      if (!field) form.reset()
    }
  }, [open, field, form])

  const selectedType = form.watch('fieldType')

  const handleSubmit = async (values: FieldFormValues) => {
    setLoading(true)
    setError(null)
    try {
      const res = await onSubmit(values)
      if (res.ok) {
        setOpen(false)
      } else {
        setError(res.error.message)
      }
    } catch (e: any) {
      setError(e.message || 'Error al guardar el campo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Añadir Campo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {field ? 'Editar Campo' : 'Nuevo Campo'}
          </DialogTitle>
          <DialogDescription className="text-muted text-xs">
            {field ? 'Modifica la estructura de este campo.' : 'Define un nuevo campo para tu esquema de datos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-muted">Nombre Visible</Label>
            <Input
              id="displayName"
              placeholder="Ej: Nombre del Cliente"
              className="bg-background border-border text-foreground"
              {...form.register('displayName')}
              onChange={(e) => {
                form.setValue('displayName', e.target.value)
                if (!field) {
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/ /g, '_')
                    .replace(/[^\w-]+/g, '')
                  form.setValue('name', slug)
                }
              }}
            />
            {form.formState.errors.displayName && (
              <p className="text-xs text-red-500">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted">ID del Campo (API)</Label>
            <Input
              id="name"
              placeholder="ej_nombre_cliente"
              disabled={!!field}
              className="bg-background border-border text-foreground"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted">Tipo de Dato</Label>
            <Select
              disabled={!!field}
              value={form.watch('fieldType')}
              onValueChange={(val) => form.setValue('fieldType', val as any)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground">
                <SelectItem value="TEXT">Texto</SelectItem>
                <SelectItem value="NUMBER">Número</SelectItem>
                <SelectItem value="BOOLEAN">Booleano (Sí/No)</SelectItem>
                <SelectItem value="DATE">Fecha</SelectItem>
                <SelectItem value="ENUM">Selección (Enum)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedType === 'ENUM' && (
            <div className="space-y-3">
              <Label className="text-muted flex justify-between">
                <span>Opciones del Enum</span>
                <span className="text-[10px] opacity-40">ENTER o COMA para añadir</span>
              </Label>
              <TagInput
                value={(form.watch('config') as any)?.options || []}
                onChange={(options) => {
                  form.setValue('config', { ...form.getValues('config'), options })
                }}
                placeholder="Añade opciones..."
              />
            </div>
          )}

          <div className="space-y-4 pt-2 border-t border-border/10">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Configuración Avanzada</Label>

            <div className="grid grid-cols-2 gap-4">
              {selectedType === 'NUMBER' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="min" className="text-muted text-xs">Mínimo</Label>
                    <Input
                      id="min"
                      type="number"
                      placeholder="0"
                      className="bg-background border-border text-foreground h-9"
                      defaultValue={(form.watch('config') as any)?.min}
                      onChange={(e) => form.setValue('config', { ...form.getValues('config'), min: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max" className="text-muted text-xs">Máximo</Label>
                    <Input
                      id="max"
                      type="number"
                      placeholder="999"
                      className="bg-background border-border text-foreground h-9"
                      defaultValue={(form.watch('config') as any)?.max}
                      onChange={(e) => form.setValue('config', { ...form.getValues('config'), max: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </>
              )}

              {selectedType === 'TEXT' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="minLength" className="text-muted text-xs">Longitud Mín.</Label>
                    <Input
                      id="minLength"
                      type="number"
                      placeholder="0"
                      className="bg-background border-border text-foreground h-9"
                      defaultValue={(form.watch('config') as any)?.minLength}
                      onChange={(e) => form.setValue('config', { ...form.getValues('config'), minLength: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLength" className="text-muted text-xs">Longitud Máx.</Label>
                    <Input
                      id="maxLength"
                      type="number"
                      placeholder="255"
                      className="bg-background border-border text-foreground h-9"
                      defaultValue={(form.watch('config') as any)?.maxLength}
                      onChange={(e) => form.setValue('config', { ...form.getValues('config'), maxLength: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultValue" className="text-muted text-xs">Valor por Defecto</Label>
              {selectedType === 'BOOLEAN' ? (
                <Select
                  value={form.watch('defaultValue')}
                  onValueChange={(val) => form.setValue('defaultValue', val)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border text-foreground">
                    <SelectItem value="true">Verdadero (true)</SelectItem>
                    <SelectItem value="false">Falso (false)</SelectItem>
                  </SelectContent>
                </Select>
              ) : selectedType === 'ENUM' ? (
                <Select
                  value={form.watch('defaultValue')}
                  onValueChange={(val) => form.setValue('defaultValue', val)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground h-9">
                    <SelectValue placeholder="Selecciona una opción..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border text-foreground">
                    {((form.watch('config') as any)?.options || []).map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="defaultValue"
                  placeholder="Ej: valor_inicial"
                  className="bg-background border-border text-foreground h-9"
                  {...form.register('defaultValue')}
                />
              )}
            </div>

            <div className="flex items-center justify-between space-x-2 bg-foreground/5 p-3 rounded-xl border border-border/5">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={!!form.watch('isRequired')}
                  onCheckedChange={(val) => form.setValue('isRequired', val)}
                />
                <Label htmlFor="isRequired" className="text-muted text-xs">Obligatorio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isUnique"
                  checked={!!form.watch('isUnique')}
                  onCheckedChange={(val) => form.setValue('isUnique', val)}
                />
                <Label htmlFor="isUnique" className="text-muted text-xs">Único</Label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-background hover:bg-primary-hover"
            disabled={loading}
          >
            {loading ? 'Guardando...' : field ? 'Actualizar' : 'Crear Campo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
