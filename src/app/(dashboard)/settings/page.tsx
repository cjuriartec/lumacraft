import { BrainCircuit, Building2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-8 py-10">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Configuración
        </p>
        <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
          Ajustes del Workspace
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          Centraliza seguridad, permisos y configuración de IA del workspace actual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/settings/ai"
          className="rounded-2xl border border-border/50 bg-surface p-6 transition-colors hover:bg-surface-hover/30"
        >
          <BrainCircuit className="text-primary" size={18} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">IA</h2>
          <p className="mt-2 text-sm text-foreground/65">
            Provider, modelos, prompt del workspace y secrets cifrados.
          </p>
        </Link>
        <Link
          href="/settings/workspace/general"
          className="rounded-2xl border border-border/50 bg-surface p-6 transition-colors hover:bg-surface-hover/30"
        >
          <Building2 className="text-primary" size={18} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Workspace</h2>
          <p className="mt-2 text-sm text-foreground/65">
            Centraliza usuarios, roles, permisos y la identidad del espacio actual.
          </p>
        </Link>
      </div>
    </div>
  );
}
