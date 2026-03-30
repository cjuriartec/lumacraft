'use client'

import { useCollections } from '../hooks/use-collections'
import { CreateCollectionDialog } from '../components/create-collection-dialog'
import { Database, Trash2, ExternalLink, Settings2, Clock, Plus } from 'lucide-react'

export default function CollectionsPage() {
  const { collections, loading, deleteCollection } = useCollections()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(16,185,129,0.08)' }}
          >
            <Database size={20} style={{ color: 'rgba(16,185,129,0.5)' }} />
          </div>
          <p
            className="text-sm font-light"
            style={{ color: 'rgba(232,240,236,0.6)' }}
          >
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
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#10b981', letterSpacing: '0.12em' }}
          >
            Motor de Datos
          </p>
          <h1
            className="text-[2.5rem] font-bold leading-tight"
            style={{ color: '#e8f0ec', letterSpacing: '-0.02em' }}
          >
            Colecciones
          </h1>
          <p
            className="text-sm font-light mt-1"
            style={{ color: 'rgba(232,240,236,0.7)' }}
          >
            {collections.length > 0
              ? `${collections.length} colección${collections.length !== 1 ? 'es' : ''} configurada${collections.length !== 1 ? 's' : ''}`
              : 'Gestiona tus tablas dinámicas de datos.'}
          </p>
        </div>
        <CreateCollectionDialog />
      </div>

      {collections.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ background: '#080c0a' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(16,185,129,0.08)' }}
          >
            <Database size={28} style={{ color: 'rgba(16,185,129,0.5)' }} />
          </div>
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: '#e8f0ec', letterSpacing: '-0.01em' }}
          >
            Sin colecciones todavía
          </h3>
          <p
            className="text-sm font-light max-w-sm mb-8"
            style={{ color: 'rgba(232,240,236,0.7)', lineHeight: '1.7' }}
          >
            Crea tu primera colección para comenzar a estructurar datos que
            alimentarán tus documentos e IA.
          </p>
          <CreateCollectionDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="group rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: '#080c0a' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                >
                  <Database size={18} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                    style={{ color: 'rgba(232,240,236,0.6)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = '#f87171'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(232,240,236,0.6)'
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                    onClick={() => deleteCollection(collection.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                    style={{ color: 'rgba(232,240,236,0.6)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = '#10b981'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(232,240,236,0.6)'
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <Settings2 size={14} />
                  </button>
                </div>
              </div>

              <h3
                className="text-[14px] font-semibold mb-1 transition-colors duration-150 group-hover:text-emerald-400"
                style={{ color: '#e8f0ec' }}
              >
                {collection.displayName || collection.name}
              </h3>
              <p
                className="text-[13px] font-light line-clamp-2 mb-5 leading-relaxed"
                style={{ color: 'rgba(232,240,236,0.7)', minHeight: '2.6rem' }}
              >
                {collection.description || 'Sin descripción.'}
              </p>

              <div
                className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid rgba(232,240,236,0.05)' }}
              >
                <div
                  className="flex items-center gap-1.5 text-[11px] font-medium"
                  style={{ color: 'rgba(232,240,236,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <Clock size={11} />
                  <span>
                    {new Date(collection.createdAt).toLocaleDateString('es', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  className="flex items-center gap-1 text-[12px] font-semibold transition-colors duration-150 group/btn"
                  style={{ color: 'rgba(16,185,129,0.4)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#10b981'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(16,185,129,0.4)'
                  }}
                >
                  Ver Datos
                  <ExternalLink size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <CreateCollectionDialog>
            <div
              className="rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 min-h-[180px]"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#0c1512'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.07)', color: 'rgba(16,185,129,0.5)' }}
              >
                <Plus size={18} />
              </div>
              <p
                className="text-[13px] font-light"
                style={{ color: 'rgba(232,240,236,0.6)' }}
              >
                Nueva colección
              </p>
            </div>
          </CreateCollectionDialog>
        </div>
      )}
    </div>
  )
}
