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
import { Plus, Database } from 'lucide-react'
import { useCollections } from '../hooks/use-collections'

interface CreateCollectionDialogProps {
  children?: React.ReactNode
}

export function CreateCollectionDialog({ children }: CreateCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const { createCollection, loading } = useCollections()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createCollection({ name, displayName, description })
    if (res?.ok) {
      setOpen(false)
      setName('')
      setDisplayName('')
      setDescription('')
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerEl}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[420px] rounded-2xl p-8"
        style={{
          background: '#0c1512',
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

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              Nombre Técnico *
            </Label>
            <Input
              id="name"
              placeholder="ej: proyectos_v2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg text-sm h-10 placeholder:font-light"
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
            <p
              className="text-[11px] font-light italic"
              style={{ color: 'rgba(232,240,236,0.6)' }}
            >
              Identificador interno único para el motor de datos.
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              Nombre Público
            </Label>
            <Input
              id="displayName"
              placeholder="ej: Portafolio de Proyectos"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-lg text-sm h-10 placeholder:font-light"
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(232,240,236,0.7)', letterSpacing: '0.1em' }}
            >
              Descripción
            </Label>
            <Textarea
              id="description"
              placeholder="Describe el propósito de esta colección..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-sm min-h-[80px] resize-none placeholder:font-light"
              style={{
                background: 'rgba(232,240,236,0.04)',
                border: '1px solid rgba(232,240,236,0.07)',
                color: '#e8f0ec',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2 hover:-translate-y-0.5"
            style={{ background: '#10b981' }}
            onMouseEnter={(e) => {
              if (!loading && name) {
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
