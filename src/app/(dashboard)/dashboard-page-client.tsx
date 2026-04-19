"use client";

import { ArrowRight, Database, FileText, Rows3 } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { useDashboardStats } from "./use-dashboard-stats";

export default function DashboardPageClient() {
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useDashboardStats();
  useBreadcrumbs([{ label: "Inicio" }]);
  useGuidancePage({ id: "dashboard" });
  const firstName = user?.fullName?.split(" ")[0] || "de nuevo";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10 space-y-3">
        <p className="text-xs font-semibold uppercase mb-3 text-primary tracking-[0.12em]">
          Dashboard
        </p>
        <h1 className="text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
          Hola, {firstName}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          Entra directo a las colecciones, registros y plantillas que puedes usar en este workspace.
        </p>
      </div>

      <div
        data-guidance-anchor="dashboard-primary-actions"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard
          title="Colecciones"
          value={statsLoading ? "..." : stats.collectionsCount.toString()}
          icon={<Database size={18} />}
          href="/collections"
          description="Explora la estructura y el detalle de cada colección."
        />
        <StatCard
          title="Registros"
          value={statsLoading ? "..." : stats.recordsCount.toString()}
          icon={<Rows3 size={18} />}
          href="/records"
          description="Consulta todos los registros accesibles desde una sola vista."
        />
        <StatCard
          title="Plantillas"
          value={statsLoading ? "..." : stats.templatesCount.toString()}
          icon={<FileText size={18} />}
          href="/templates"
          description="Revisa las plantillas disponibles en tus colecciones."
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border/40 bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
          {icon}
        </div>
        <ArrowRight
          size={16}
          className="text-primary/35 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      <p className="text-3xl font-bold tracking-[-0.02em] text-foreground">{value}</p>
      <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-[13px] font-light leading-relaxed text-foreground/68">
        {description}
      </p>
    </Link>
  );
}
