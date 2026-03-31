'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { AlertCircle, Search, Plus, X } from 'lucide-react'
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
import { Badge } from '@/shared/presentation/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/presentation/components/ui/select'
import { TagInput } from '@/shared/presentation/components/ui/tag-input'
import { Field } from '../../domain/entities/field.entity'
import { useMimeTypes } from '../hooks/use-mime-types'
import { cn } from '@/shared/lib/utils'

const fieldSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos'),
  displayName: z.string().min(2, 'El nombre visible debe tener al menos 2 caracteres'),
  fieldType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'RELATION', 'FILE', 'LOCATION']),
  isRequired: z.boolean().default(false).optional(),
  isUnique: z.boolean().default(false).optional(),
  defaultValue: z.string().optional(),
  config: z.record(z.string(), z.any()).default({}).optional(),
})

type FieldFormValues = z.infer<typeof fieldSchema>

interface FieldFormDialogProps {
  field?: Field
  onSubmit: (values: FieldFormValues) => Promise<any>
  availableCollections?: Array<{ id: string; name: string; displayName?: string }>
  children?: React.ReactNode
}

export function FieldFormDialog({
  field,
  onSubmit,
  availableCollections = [],
  children,
}: FieldFormDialogProps) {
  const { mimeTypes, loading: loadingMimeTypes } = useMimeTypes()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mimeSearch, setMimeSearch] = useState('')

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

  const addMimeType = (mime: string) => {
    const current = (form.getValues('config') as any)?.allowedMimeTypes || []
    if (!current.includes(mime)) {
      form.setValue('config', { ...form.getValues('config'), allowedMimeTypes: [...current, mime] })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Añadir Campo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-surface border-border overflow-y-auto max-h-[90vh]">
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
              <SelectContent className="bg-surface border-border text-foreground font-poppins">
                <SelectItem value="TEXT">Texto</SelectItem>
                <SelectItem value="NUMBER">Número</SelectItem>
                <SelectItem value="BOOLEAN">Booleano (Sí/No)</SelectItem>
                <SelectItem value="DATE">Fecha</SelectItem>
                <SelectItem value="ENUM">Selección (Enum)</SelectItem>
                <SelectItem value="RELATION">Relación</SelectItem>
                <SelectItem value="FILE">Archivo</SelectItem>
                <SelectItem value="LOCATION">Ubicación</SelectItem>
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

          {selectedType === 'RELATION' && (
            <div className="space-y-3 rounded-xl border border-border/30 p-3">
              <div className="space-y-2">
                <Label className="text-muted">Colección Destino</Label>
                <Select
                  value={String((form.watch('config') as any)?.targetCollectionId || '')}
                  onValueChange={(value) =>
                    form.setValue('config', {
                      ...form.getValues('config'),
                      targetCollectionId: value,
                    })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecciona una colección" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border text-foreground">
                    {availableCollections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.displayName || collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted">Tipo de Relación</Label>
                <Select
                  value={String((form.watch('config') as any)?.relationType || '')}
                  onValueChange={(value) =>
                    form.setValue('config', {
                      ...form.getValues('config'),
                      relationType: value,
                      allowMultiple: value !== 'ONE_TO_ONE',
                      displayField: (form.getValues('config') as any)?.displayField || 'id',
                    })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecciona cardinalidad" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border text-foreground">
                    <SelectItem value="ONE_TO_ONE">1:1</SelectItem>
                    <SelectItem value="ONE_TO_MANY">1:N</SelectItem>
                    <SelectItem value="MANY_TO_MANY">N:M</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relation-display-field" className="text-muted">Campo de visualización</Label>
                <Input
                  id="relation-display-field"
                  placeholder="id"
                  className="bg-background border-border text-foreground"
                  value={String((form.watch('config') as any)?.displayField || '')}
                  onChange={(event) =>
                    form.setValue('config', {
                      ...form.getValues('config'),
                      displayField: event.target.value,
                    })
                  }
                />
                <p className="text-[10px] text-muted">
                  Campo de la colección destino que se mostrará en los selects de relación.
                </p>
              </div>

            </div>
          )}

          {selectedType === 'FILE' && (
            <div className="space-y-3 rounded-xl border border-border/30 p-3">
              <div className="space-y-2">
                <Label htmlFor="maxSizeBytes" className="text-muted text-xs">Tamaño máximo (MB)</Label>
                <Input
                  id="maxSizeBytes"
                  type="number"
                  min={1}
                  placeholder="10"
                  className="bg-background border-border text-foreground h-9"
                  value={
                    ((form.watch('config') as any)?.maxSizeBytes
                      ? Number((form.watch('config') as any)?.maxSizeBytes) / (1024 * 1024)
                      : '') as any
                  }
                  onChange={(e) => {
                    const mb = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('config', {
                      ...form.getValues('config'),
                      maxSizeBytes: mb ? Math.round(mb * 1024 * 1024) : undefined,
                    })
                  }}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted text-xs">Mime types permitidos</Label>
                  <span className="text-[10px] text-primary/60 font-medium">Solo formatos maestros</span>
                </div>

                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-muted opacity-50" />
                  <Input
                    placeholder="Buscar formato... (ej: png)"
                    className="h-8 pl-8 text-[11px] bg-background/50 border-border/20 mb-2"
                    onChange={(e) => {
                      // We can filter the display list
                      const term = e.target.value.toLowerCase()
                      const filtered = mimeTypes.filter(m =>
                        m.label.toLowerCase().includes(term) ||
                        m.value.toLowerCase().includes(term) ||
                        m.extension?.toLowerCase().includes(term)
                      )
                      // Local state for search only
                      setMimeSearch(term)
                    }}
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-border/20 bg-foreground/5 p-2 space-y-1 scrollbar-thin">
                  {loadingMimeTypes ? (
                    <div className="py-8 text-center animate-pulse text-[10px] text-muted font-medium uppercase tracking-widest">Cargando catálogo...</div>
                  ) : (
                    mimeTypes
                      .filter(m => !mimeSearch || m.label.toLowerCase().includes(mimeSearch) || m.value.toLowerCase().includes(mimeSearch))
                      .map((mime) => {
                        const isSelected = ((form.watch('config') as any)?.allowedMimeTypes || []).includes(mime.value)
                        return (
                          <button
                            key={mime.value}
                            type="button"
                            onClick={() => {
                              const current = (form.getValues('config') as any)?.allowedMimeTypes || []
                              const next = isSelected
                                ? current.filter((v: string) => v !== mime.value)
                                : [...current, mime.value]
                              form.setValue('config', { ...form.getValues('config'), allowedMimeTypes: next })
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all",
                              isSelected
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "hover:bg-surface-hover/20 text-muted-foreground/80 border border-transparent"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold uppercase tracking-tight">{mime.label}</span>
                              <span className="text-[9px] opacity-60 font-mono">{mime.value}</span>
                            </div>
                            {isSelected ? (
                              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                <Plus size={10} className="text-background rotate-45" />
                              </div>
                            ) : (
                              <Plus size={12} className="opacity-0 group-hover:opacity-40" />
                            )}
                          </button>
                        )
                      })
                  )}
                  {mimeTypes.length > 0 && mimeTypes.filter(m => !mimeSearch || m.label.toLowerCase().includes(mimeSearch) || m.value.toLowerCase().includes(mimeSearch)).length === 0 && (
                    <div className="py-6 text-center text-[10px] text-muted italic">No se encontraron formatos.</div>
                  )}
                </div>

                {((form.watch('config') as any)?.allowedMimeTypes || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/10">
                    {((form.watch('config') as any)?.allowedMimeTypes || []).map((mValue: string) => {
                      const match = mimeTypes.find(mt => mt.value === mValue)
                      return (
                        <Badge key={mValue} variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[9px] py-0 px-2 h-5">
                          {match?.extension || mValue.split('/')[1]}
                          <button
                            onClick={() => {
                              const next = (form.getValues('config') as any)?.allowedMimeTypes.filter((v: string) => v !== mValue)
                              form.setValue('config', { ...form.getValues('config'), allowedMimeTypes: next })
                            }}
                            className="ml-1 hover:text-red-400"
                          >
                            <X size={10} />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedType === 'LOCATION' && (
            <div className="space-y-3 rounded-xl border border-border/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minLat" className="text-muted text-xs">Lat mín</Label>
                  <Input
                    id="minLat"
                    type="number"
                    className="bg-background border-border text-foreground h-9"
                    value={(form.watch('config') as any)?.minLat ?? ''}
                    onChange={(e) =>
                      form.setValue('config', {
                        ...form.getValues('config'),
                        minLat: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLat" className="text-muted text-xs">Lat máx</Label>
                  <Input
                    id="maxLat"
                    type="number"
                    className="bg-background border-border text-foreground h-9"
                    value={(form.watch('config') as any)?.maxLat ?? ''}
                    onChange={(e) =>
                      form.setValue('config', {
                        ...form.getValues('config'),
                        maxLat: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minLng" className="text-muted text-xs">Lng mín</Label>
                  <Input
                    id="minLng"
                    type="number"
                    className="bg-background border-border text-foreground h-9"
                    value={(form.watch('config') as any)?.minLng ?? ''}
                    onChange={(e) =>
                      form.setValue('config', {
                        ...form.getValues('config'),
                        minLng: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLng" className="text-muted text-xs">Lng máx</Label>
                  <Input
                    id="maxLng"
                    type="number"
                    className="bg-background border-border text-foreground h-9"
                    value={(form.watch('config') as any)?.maxLng ?? ''}
                    onChange={(e) =>
                      form.setValue('config', {
                        ...form.getValues('config'),
                        maxLng: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
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

            {!['RELATION', 'FILE', 'LOCATION'].includes(selectedType) && (
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
            )}

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
