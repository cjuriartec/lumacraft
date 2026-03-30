'use client'

import { useCollections } from '../hooks/use-collections'
import { CreateCollectionDialog } from '../components/create-collection-dialog'
import { Database, Trash2, ExternalLink, Settings2, Clock, Plus } from 'lucide-react'

export default function CollectionsPage() {
  const { collections, loading, deleteCollection, refresh } = useCollections()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse bg-primary/10">
            <Database size={20} className="text-primary/50" />
          </div>
          <p className="text-sm font-light text-foreground/60">
            Cargando colecciones...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 text-primary">
            Motor de Datos
          </p>
          <h1 className="text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
            Colecciones
          </h1>
          <p className="text-sm font-light mt-1 text-foreground/70">
            {collections.length > 0
              ? `${collections.length} colección${collections.length !== 1 ? 'es' : ''} configurada${collections.length !== 1 ? 's' : ''}`
              : 'Gestiona tus tablas dinámicas de datos.'}
          </p>
        </div>
        <CreateCollectionDialog onSuccess={refresh} />
      </div>

      {collections.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl text-center bg-surface">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-primary/10">
            <Database size={28} className="text-primary/50" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground tracking-[-0.01em]">
            Sin colecciones todavía
          </h3>
          <p className="text-sm font-light max-w-sm mb-8 text-foreground/70 leading-[1.7]">
            Crea tu primera colección para comenzar a estructurar datos que
            alimentarán tus documentos e IA.
          </p>
          <CreateCollectionDialog onSuccess={refresh} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="group rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 bg-surface"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105 bg-primary/10 text-primary">
                  <Database size={18} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-foreground/60 hover:text-red-400 hover:bg-red-400/10"
                    onClick={() => deleteCollection(collection.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-foreground/60 hover:text-primary hover:bg-primary/10">
                    <Settings2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-[14px] font-semibold mb-1 transition-colors duration-150 group-hover:text-primary text-foreground">
                {collection.displayName || collection.name}
              </h3>
              <p className="text-[13px] font-light line-clamp-2 mb-5 leading-relaxed text-foreground/70 min-h-[2.6rem]">
                {collection.description || 'Sin descripción.'}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/60 uppercase tracking-[0.05em]">
                  <Clock size={11} />
                  <span>
                    {new Date(collection.createdAt).toLocaleDateString('es', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <button className="flex items-center gap-1 text-[12px] font-semibold transition-colors duration-150 group/btn text-primary/60 hover:text-primary">
                  Ver Datos
                  <ExternalLink size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <CreateCollectionDialog onSuccess={refresh}>
            <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 min-h-[180px] bg-transparent hover:bg-surface/50">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary/50">
                <Plus size={18} />
              </div>
              <p className="text-[13px] font-light text-foreground/60">
                Nueva colección
              </p>
            </div>
          </CreateCollectionDialog>
        </div>
      )}
    </div>
  )
}
