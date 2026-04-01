'use client'

import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'
import { useBreadcrumbs } from '@/shared/presentation/providers/breadcrumb-provider'
import { Database, FileText, TrendingUp, ArrowRight, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  useBreadcrumbs([{ label: 'Inicio' }])
  const firstName = user?.fullName?.split(' ')[0] || 'de nuevo'

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase mb-3 text-primary tracking-[0.12em]">
          Dashboard
        </p>
        <h1 className="text-[2.5rem] font-bold leading-tight mb-2 text-foreground tracking-[-0.02em]">
          Hola, {firstName}
        </h1>
        <p className="text-base font-light text-foreground/70">
          Bienvenido a tu motor dinámico de datos con IA.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <StatCard
          title="Colecciones"
          value="0"
          icon={<Database size={18} />}
          trend="Esta semana"
        />
        <StatCard
          title="Registros Totales"
          value="0"
          icon={<TrendingUp size={18} />}
          trend="Hoy"
        />
        <StatCard
          title="Documentos Generados"
          value="0"
          icon={<FileText size={18} />}
          trend="Este mes"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4 text-foreground/60">
          Acciones rápidas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            href="/collections"
            icon={<Database size={20} />}
            title="Crear Colección"
            description="Define una nueva tabla dinámica para organizar tus datos de forma estructurada."
            badge="Motor de Datos"
          />
          <QuickAction
            href="/templates"
            icon={<FileText size={20} />}
            title="Crear Plantilla"
            description="Diseña documentos inteligentes que se generan automáticamente con tus datos."
            badge="IA"
          />
        </div>
      </div>

      {/* AI Banner */}
      <div className="rounded-2xl p-8 relative overflow-hidden mt-8 bg-surface dark:bg-surface-hover dark:ring-1 dark:ring-white/5">
        {/* Accent line top */}
        <div className="absolute top-0 left-8 right-8 h-px from-transparent via-primary/40 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Próximamente
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground tracking-[-0.015em]">
            AI Engine con Gemini
          </h2>
          <p className="font-light max-w-lg text-foreground/70 leading-[1.65]">
            Generación contextual de documentos, análisis de datos y automatización
            de flujos de trabajo impulsados por Gemini Pro.
          </p>
        </div>

        {/* Ghost icon */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <Sparkles
            size={80}
            className="text-primary opacity-5"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title, value, icon, trend
}: {
  title: string; value: string; icon: React.ReactNode; trend: string
}) {
  return (
    <div className="rounded-xl p-5 group transition-all duration-200 hover:-translate-y-0.5 bg-surface dark:bg-surface-hover dark:ring-1 dark:ring-white/5">
      <div className="flex items-center justify-between mb-5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-[11px] font-medium text-foreground/60">
          {trend}
        </span>
      </div>
      <p className="text-3xl font-bold mb-1 text-foreground tracking-[-0.02em]">
        {value}
      </p>
      <p className="text-sm font-light text-foreground/70">
        {title}
      </p>
    </div>
  )
}

function QuickAction({
  href, icon, title, description, badge
}: {
  href: string; icon: React.ReactNode; title: string; description: string; badge: string
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 bg-surface dark:bg-surface-hover dark:ring-1 dark:ring-white/5"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary tracking-[0.05em]">
              {badge}
            </span>
          </div>
          <p className="text-[13px] font-light leading-relaxed text-foreground/70">
            {description}
          </p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 mt-0.5 transition-all duration-200 group-hover:translate-x-0.5 text-primary/30"
        />
      </div>
    </Link>
  )
}
