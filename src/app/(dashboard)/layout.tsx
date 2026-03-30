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
      <div className="flex h-screen overflow-hidden bg-background text-foreground">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-300 ease-out lg:translate-x-0 bg-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {/* Logo */}
          <div className="h-14 flex items-center px-5 mb-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary">
                <Layers size={14} className="text-white" />
              </div>
              <span className="font-bold text-[15px] tracking-tight text-foreground">
                Lumacraft
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 mt-1 text-foreground/60">
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
          <header className="h-14 flex items-center justify-between px-6 shrink-0 bg-background">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg transition-colors text-foreground/70 hover:bg-surface"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft size={18} />
              </button>
              <Breadcrumb />
            </div>

            <div className="flex items-center gap-3">
              <UserMenu />
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto bg-background">
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
    return <span className="text-sm font-medium text-foreground/80">Inicio</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-foreground/60">Workspace</span>
      <ChevronRight size={12} className="text-foreground/30" />
      <span className="text-sm font-medium text-foreground">
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${active ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:text-foreground hover:bg-surface'}`}
    >
      <span className={active ? 'text-primary' : 'text-inherit opacity-70'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {active && (
        <span className="w-1 h-1 rounded-full bg-primary" />
      )}
    </Link>
  )
}
