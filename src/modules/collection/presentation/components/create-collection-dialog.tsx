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
    <button
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-[13px] text-white transition-all duration-150 hover:-translate-y-0.5"
      style={{ background: '#10b981' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#059669'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#10b981'
      }}
    >
      <Plus size={15} />
      Nueva Colección
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerEl}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[420px] rounded-2xl p-8"
        style={{
          background: '#080c0a',
          border: 'none',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        <DialogHeader>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
          >
            <Database size={20} />
          </div>
          <DialogTitle
            className="text-xl font-bold"
            style={{ color: '#e8f0ec', letterSpacing: '-0.01em' }}
          >
            Nueva Colección
          </DialogTitle>
          <DialogDescription
            className="font-light text-sm"
            style={{ color: 'rgba(232,240,236,0.7)' }}
          >
            Define los metadatos de tu nueva tabla dinámica de datos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[11px] font-semibold uppercase tracking-widest flex justify-between"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              <span>Nombre Técnico *</span>
              {errors.name && (
                <span className="text-red-400 flex items-center gap-1 normal-case" style={{ letterSpacing: 'normal' }}>
                  <AlertCircle size={10} />
                  {errors.name.message}
                </span>
              )}
            </Label>
            <Input
              id="name"
              placeholder="ej: proyectos_v2"
              {...register('name')}
              className={`rounded-lg text-sm h-10 placeholder:font-light transition-colors ${errors.name ? 'focus-visible:ring-red-500/50' : ''}`}
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: errors.name ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
            {!errors.name && (
              <p
                className="text-[11px] font-light italic"
                style={{ color: 'rgba(232,240,236,0.6)' }}
              >
                Identificador interno único para el motor de datos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-[11px] font-semibold uppercase tracking-widest flex justify-between"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              <span>Nombre Público</span>
              {errors.displayName && (
                <span className="text-red-400 flex items-center gap-1 normal-case" style={{ letterSpacing: 'normal' }}>
                  <AlertCircle size={10} />
                  {errors.displayName.message}
                </span>
              )}
            </Label>
            <Input
              id="displayName"
              placeholder="ej: Portafolio de Proyectos"
              {...register('displayName')}
              className="rounded-lg text-sm h-10 placeholder:font-light transition-colors"
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: errors.displayName ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-[11px] font-semibold uppercase tracking-widest flex justify-between"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              <span>Descripción</span>
              {errors.description && (
                <span className="text-red-400 flex items-center gap-1 normal-case" style={{ letterSpacing: 'normal' }}>
                  <AlertCircle size={10} />
                  {errors.description.message}
                </span>
              )}
            </Label>
            <Textarea
              id="description"
              placeholder="Describe el propósito de esta colección..."
              {...register('description')}
              className="rounded-lg text-sm min-h-[80px] resize-none placeholder:font-light transition-colors"
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: errors.description ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2 hover:-translate-y-0.5"
            style={{ background: '#10b981' }}
            onMouseEnter={(e) => {
              if (!loading && isValid) {
                (e.currentTarget as HTMLElement).style.background = '#059669'
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#10b981'
            }}
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
