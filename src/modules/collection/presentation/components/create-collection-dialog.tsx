'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/presentation/components/ui/dialog'
import { Input } from '@/shared/presentation/components/ui/input'
import { Label } from '@/shared/presentation/components/ui/label'
import { Textarea } from '@/shared/presentation/components/ui/textarea'
import { Plus, Database, AlertCircle } from 'lucide-react'
import { useCollections } from '../hooks/use-collections'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const collectionSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Mínimo 3 caracteres' })
    .max(50, { message: 'Máximo 50 caracteres' })
    .regex(/^[a-z0-9_]+$/, { message: 'Solo letras, números y guiones bajos' }),
  displayName: z.string().max(100, { message: 'Máximo 100 caracteres' }).optional(),
  description: z.string().max(500, { message: 'Máximo 500 caracteres' }).optional(),
})

type CollectionFormValues = z.infer<typeof collectionSchema>

interface CreateCollectionDialogProps {
  children?: React.ReactNode
}

export function CreateCollectionDialog({ children }: CreateCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const { createCollection, loading } = useCollections()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
    },
  })

  const onSubmit = async (data: CollectionFormValues) => {
    const res = await createCollection(data)
    if (res?.ok) {
      setOpen(false)
      reset()
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset() // Limpiar cuando se cierra manualmente
    }
  }

  const triggerEl = children ?? (
    <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-[13px] text-primary-foreground bg-primary hover:bg-primary-hover transition-all duration-150 hover:-translate-y-0.5">
      <Plus size={15} />
      Nueva Colección
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerEl}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] rounded-2xl p-8 bg-surface border-none shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-primary/10 text-primary">
            <Database size={20} />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground tracking-[-0.01em]">
            Nueva Colección
          </DialogTitle>
          <DialogDescription className="font-light text-sm text-foreground/70">
            Define los metadatos de tu nueva tabla dinámica de datos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[11px] font-semibold uppercase flex justify-between text-foreground/70"
            >
              <span>Nombre Técnico *</span>
              {errors.name && (
                <span className="text-red-400 flex items-center gap-1 normal-case tracking-normal">
                  <AlertCircle size={10} />
                  {errors.name.message}
                </span>
              )}
            </Label>
            <Input
              id="name"
              placeholder="ej: proyectos_v2"
              {...register('name')}
              className={`rounded-lg text-sm h-10 placeholder:font-light transition-colors bg-foreground/5 text-foreground ${errors.name ? 'border-red-400/50 focus-visible:ring-red-500/50' : 'border-border'}`}
            />
            {!errors.name && (
              <p className="text-[11px] font-light italic text-foreground/60">
                Identificador interno único para el motor de datos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-[11px] font-semibold uppercase flex justify-between text-foreground/70"
            >
              <span>Nombre Público</span>
              {errors.displayName && (
                <span className="text-red-400 flex items-center gap-1 normal-case tracking-normal">
                  <AlertCircle size={10} />
                  {errors.displayName.message}
                </span>
              )}
            </Label>
            <Input
              id="displayName"
              placeholder="ej: Portafolio de Proyectos"
              {...register('displayName')}
              className="rounded-lg text-sm h-10 placeholder:font-light transition-colors bg-foreground/5 text-foreground border-border"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-[11px] font-semibold uppercase flex justify-between text-foreground/70"
            >
              <span>Descripción</span>
              {errors.description && (
                <span className="text-red-400 flex items-center gap-1 normal-case tracking-normal">
                  <AlertCircle size={10} />
                  {errors.description.message}
                </span>
              )}
            </Label>
            <Textarea
              id="description"
              placeholder="Describe el propósito de esta colección..."
              {...register('description')}
              className="rounded-lg text-sm min-h-[80px] resize-none placeholder:font-light transition-colors bg-foreground/5 text-foreground border-border"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2 hover:-translate-y-0.5 bg-primary hover:bg-primary-hover disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Colección'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
