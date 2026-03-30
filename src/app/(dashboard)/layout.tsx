'use client'

import { LayoutDashboard, Database, FileText, Settings, Share2, PanelLeft, ChevronRight, Layers } from 'lucide-react'
import UserMenu from '@/modules/auth/presentation/components/user-menu'
import AuthGuard from '@/modules/auth/presentation/components/auth-guard'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden" style={{ background: '#0d1410', color: '#e8f0ec' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          style={{ background: '#030906' }}>
          {/* Logo */}
          <div className="h-14 flex items-center px-5 mb-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#10b981' }}
              >
                <Layers size={14} className="text-white" />
              </div>
              <span className="font-bold text-[15px] tracking-tight" style={{ color: '#e8f0ec' }}>
                Lumacraft
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 mt-1"
              style={{ color: 'rgba(232,240,236,0.6)' }}
            >
              Principal
            </p>
            <NavLink href="/" icon={<LayoutDashboard size={16} />} label="Inicio" />
            <NavLink href="/collections" icon={<Database size={16} />} label="Colecciones" />
            <NavLink href="/templates" icon={<FileText size={16} />} label="Documentos" />
            <NavLink href="/relations" icon={<Share2 size={16} />} label="Relaciones" />
          </nav>

          {/* Bottom */}
          <div className="p-3 pb-5">
            <NavLink href="/settings" icon={<Settings size={16} />} label="Configuración" />
          </div>
        </aside>



        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header
            className="h-14 flex items-center justify-between px-6 shrink-0"
            style={{ background: '#000' }}
          >
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(232,240,236,0.7)' }}
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft size={18} />
              </button>
              <Breadcrumb />
            </div>

            <UserMenu />
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto" style={{ background: '#000' }}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    collections: 'Colecciones',
    templates: 'Documentos',
    relations: 'Relaciones',
    settings: 'Configuración',
  }

  if (segments.length === 0) {
    return <span className="text-sm font-medium" style={{ color: 'rgba(232,240,236,0.7)' }}>Inicio</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm" style={{ color: 'rgba(232,240,236,0.6)' }}>Workspace</span>
      <ChevronRight size={12} style={{ color: 'rgba(232,240,236,0.3)' }} />
      <span className="text-sm font-medium" style={{ color: 'rgba(232,240,236,0.9)' }}>
        {labels[segments[0]] || segments[0]}
      </span>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150"
      style={{
        color: active ? '#10b981' : 'rgba(232,240,236,0.7)',
        background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'rgba(232,240,236,0.95)'
            ; (e.currentTarget as HTMLElement).style.background = 'rgba(232,240,236,0.04)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'rgba(232,240,236,0.7)'
            ; (e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}
    >
      <span style={{ color: active ? '#10b981' : 'rgba(232,240,236,0.6)' }}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {active && (
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: '#10b981' }}
        />
      )}
    </Link>
  )
}
